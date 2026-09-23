import { withTransaction } from "../../../shared/db/withTransaction.js";
import { fail, ok, type Result } from "../../../shared/result/Result.js";
import { eventBus } from "../../../shared/events/EventBus.js";
import { recordEvent } from "../../../shared/events/DomainEvent.js";
import { releaseStock } from "../../inventory/index.js";
import { canTransition, type OrderStatus } from "../domain/OrderStatus.js";
import {
	findOrderForUpdate,
	findOrderItems,
	updateOrderStatus,
	validateAllPrescriptions,
} from "../infra/OrderRepository.js";
import { BusinessRollback } from "./BusinessRollback.js";

export interface StatusChangeResult {
	orderId: string;
	status: OrderStatus;
}

interface Options {
	orderId: string;
	patientId: string;
	target: OrderStatus;
	eventType: string;
	/** Devuelve el inventario al cancelar. */
	releaseInventory?: boolean;
	/** Marca las recetas pendientes como validadas al aprobar. */
	validatePrescriptions?: boolean;
}

/**
 * Tronco común de las transiciones de estado.
 *
 * Los tres comandos que cambian el estado de una orden comparten la misma
 * coreografía: bloquear la fila, comprobar la propiedad, comprobar que la
 * transición es legal, aplicar efectos, registrar el evento. Lo que cambia es
 * el estado destino y los efectos, y eso son los parámetros.
 */
export async function changeOrderStatus(
	opts: Options,
): Promise<Result<StatusChangeResult>> {
	try {
		const result = await withTransaction(async (client) => {
			const order = await findOrderForUpdate(client, opts.orderId);

			if (!order) {
				throw new BusinessRollback([
					{ field: "orderId", message: "La orden no existe", code: "NOT_FOUND" },
				]);
			}

			// Autorización: nadie toca órdenes ajenas. Mismo mensaje que
			// "no existe" sería más discreto, pero aquí el id ya lo tiene
			// el cliente, así que ser explícito no filtra nada.
			if (order.patientId !== opts.patientId) {
				throw new BusinessRollback([
					{ message: "Esta orden pertenece a otro paciente", code: "UNAUTHORIZED" },
				]);
			}

			if (!canTransition(order.status, opts.target)) {
				throw new BusinessRollback([
					{
						field: "status",
						message: `No se puede pasar de ${order.status} a ${opts.target}`,
						code: "CONFLICT",
					},
				]);
			}

			if (opts.releaseInventory) {
				const items = await findOrderItems(client, opts.orderId);
				for (const item of items) {
					await releaseStock(client, item.medicationId, item.quantity);
				}
			}

			if (opts.validatePrescriptions) {
				await validateAllPrescriptions(client, opts.orderId);
			}

			await updateOrderStatus(client, opts.orderId, opts.target);

			await recordEvent(client, {
				aggregateType: "Order",
				aggregateId: opts.orderId,
				eventType: opts.eventType,
				payload: { from: order.status, to: opts.target },
			});

			return { orderId: opts.orderId, status: opts.target };
		});

		eventBus.publish([
			{
				aggregateType: "Order",
				aggregateId: result.orderId,
				eventType: opts.eventType,
				payload: { status: result.status },
			},
		]);

		return ok(result);
	} catch (err) {
		if (err instanceof BusinessRollback) return fail(...err.errors);
		throw err;
	}
}
