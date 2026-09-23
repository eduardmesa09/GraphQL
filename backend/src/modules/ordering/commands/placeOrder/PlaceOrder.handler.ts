import { withTransaction } from "../../../../shared/db/withTransaction.js";
import { fail, ok, type Result, type UserErrorShape } from "../../../../shared/result/Result.js";
import { eventBus } from "../../../../shared/events/EventBus.js";
import { ORDER_PLACED, recordEvent } from "../../../../shared/events/DomainEvent.js";
import { findMedicationsForOrder } from "../../../catalog/index.js";
import { reserveStock } from "../../../inventory/index.js";
import {
	findMissingPrescriptions,
	validateSupport,
} from "../../domain/rules/PrescriptionPolicy.js";
import { calculateTotal, type OrderLine } from "../../domain/Order.js";
import type { OrderStatus } from "../../domain/OrderStatus.js";
import { insertOrder, insertOrderItems, insertPrescriptions } from "../../infra/OrderRepository.js";
import { BusinessRollback } from "../BusinessRollback.js";
import type { PlaceOrderCommand } from "./PlaceOrder.command.js";

export interface PlaceOrderResult {
	orderId: string;
	status: OrderStatus;
	total: number;
}

export async function placeOrder(
	cmd: PlaceOrderCommand,
): Promise<Result<PlaceOrderResult>> {
	// ─── 1. Validaciones de forma, antes de tocar la base ───
	const formErrors = validateShape(cmd);
	if (formErrors.length > 0) return fail(...formErrors);

	try {
		const result = await withTransaction(async (client) => {
			const ids = cmd.items.map((i) => i.medicationId);
			const medications = await findMedicationsForOrder(client, ids);
			const porId = new Map(medications.map((m) => [m.id, m]));

			// ─── 2. Existencia ───
			const inexistentes = ids.filter((id) => !porId.has(id));
			if (inexistentes.length > 0) {
				throw new BusinessRollback(
					inexistentes.map((id) => ({
						field: "items",
						message: `El medicamento ${id} no existe en el catálogo`,
						code: "NOT_FOUND" as const,
					})),
				);
			}

			// ─── 3. Invariante farmacéutica: fórmula médica ───
			const faltantes = findMissingPrescriptions(medications, cmd.prescriptions);
			if (faltantes.length > 0) {
				throw new BusinessRollback(
					faltantes.map((f) => ({
						field: "prescriptions",
						message: `"${f.medicationName}" requiere fórmula médica para ser ordenado`,
						code: "PRESCRIPTION_REQUIRED" as const,
					})),
				);
			}

			// ─── 4. Invariante de inventario: reserva atómica ───
			const lines: OrderLine[] = [];
			for (const item of cmd.items) {
				const med = porId.get(item.medicationId)!;
				const reservado = await reserveStock(client, med.id, item.quantity);

				if (!reservado) {
					// El ROLLBACK devuelve también las reservas ya hechas en este
					// bucle: o se apartan todas las líneas, o ninguna.
					throw new BusinessRollback([
						{
							field: "items",
							message: `Stock insuficiente de "${med.name}": se pidieron ${item.quantity} y hay ${med.stock} disponibles`,
							code: "OUT_OF_STOCK" as const,
						},
					]);
				}

				lines.push({
					medicationId: med.id,
					quantity: item.quantity,
					unitPrice: Number(med.price), // precio congelado
				});
			}

			// ─── 5. Persistencia ───
			const total = calculateTotal(lines);
			const requiereRevision = cmd.prescriptions.length > 0;
			const status: OrderStatus = requiereRevision ? "PENDING_APPROVAL" : "APPROVED";

			const order = await insertOrder(client, cmd.patientId, status, total);
			await insertOrderItems(client, order.id, lines);
			await insertPrescriptions(client, order.id, cmd.prescriptions);

			// ─── 6. El evento viaja en la MISMA transacción ───
			await recordEvent(client, {
				aggregateType: "Order",
				aggregateId: order.id,
				eventType: ORDER_PLACED,
				payload: { patientId: cmd.patientId, status, total, itemCount: lines.length },
			});

			return { orderId: order.id, status, total };
		});

		// ─── 7. Ya hay COMMIT: se dispara la proyección (consistencia eventual) ───
		eventBus.publish([
			{
				aggregateType: "Order",
				aggregateId: result.orderId,
				eventType: ORDER_PLACED,
				payload: { status: result.status },
			},
		]);

		return ok(result);
	} catch (err) {
		if (err instanceof BusinessRollback) return fail(...err.errors);
		throw err; // fallo real de infraestructura: que suba
	}
}

function validateShape(cmd: PlaceOrderCommand): UserErrorShape[] {
	const errors: UserErrorShape[] = [];

	if (cmd.items.length === 0) {
		errors.push({ field: "items", message: "El pedido debe tener al menos un ítem", code: "VALIDATION" });
	}

	for (const item of cmd.items) {
		if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
			errors.push({
				field: "items",
				message: `La cantidad de ${item.medicationId} debe ser un entero mayor que cero`,
				code: "VALIDATION",
			});
		}
	}

	const ids = cmd.items.map((i) => i.medicationId);
	if (new Set(ids).size !== ids.length) {
		errors.push({
			field: "items",
			message: "Hay medicamentos repetidos: agrupe las cantidades en una sola línea",
			code: "VALIDATION",
		});
	}

	for (const support of cmd.prescriptions) {
		const problema = validateSupport(support);
		if (problema) {
			errors.push({ field: "prescriptions", message: problema, code: "PRESCRIPTION_INVALID" });
		}
	}

	return errors;
}
