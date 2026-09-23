import type { PoolClient } from "pg";
import { txQuery } from "../../../shared/db/withTransaction.js";
import { query } from "../../../shared/db/pool.js";
import type { OrderStatus } from "../domain/OrderStatus.js";
import type { OrderLine } from "../domain/Order.js";
import type { PrescriptionSupport } from "../domain/rules/PrescriptionPolicy.js";

export interface OrderRow {
	id: string;
	patientId: string;
	status: OrderStatus;
	total: string;
	createdAt: Date;
}

export interface OrderItemRow {
	medicationId: string;
	quantity: number;
	unitPrice: string;
}

export async function insertOrder(
	client: PoolClient,
	patientId: string,
	status: OrderStatus,
	total: number,
): Promise<OrderRow> {
	const rows = await txQuery<OrderRow>(
		client,
		`insert into orders (patient_id, status, total)
		 values ($1, $2::order_status, $3)
		 returning id, patient_id as "patientId", status, total, created_at as "createdAt"`,
		[patientId, status, total],
	);
	return rows[0]!;
}

export async function insertOrderItems(
	client: PoolClient,
	orderId: string,
	lines: OrderLine[],
): Promise<void> {
	// unnest: una sola sentencia para N líneas, en vez de N inserts.
	await txQuery(
		client,
		`insert into order_items (order_id, medication_id, quantity, unit_price)
		 select $1, m.id, m.qty, m.price
		 from unnest($2::uuid[], $3::int[], $4::numeric[]) as m(id, qty, price)`,
		[
			orderId,
			lines.map((l) => l.medicationId),
			lines.map((l) => l.quantity),
			lines.map((l) => l.unitPrice),
		],
	);
}

export async function insertPrescriptions(
	client: PoolClient,
	orderId: string,
	support: PrescriptionSupport[],
): Promise<void> {
	if (support.length === 0) return;

	await txQuery(
		client,
		`insert into prescriptions
		   (order_id, medication_id, doctor_name, doctor_license, issued_at, document_url)
		 select $1, p.med, p.doctor, p.license, p.issued::date, p.url
		 from unnest($2::uuid[], $3::text[], $4::text[], $5::text[], $6::text[])
		      as p(med, doctor, license, issued, url)`,
		[
			orderId,
			support.map((s) => s.medicationId),
			support.map((s) => s.doctorName.trim()),
			support.map((s) => s.doctorLicense.trim()),
			support.map((s) => s.issuedAt),
			support.map((s) => s.documentUrl ?? null),
		],
	);
}

export async function findOrderForUpdate(
	client: PoolClient,
	orderId: string,
): Promise<OrderRow | null> {
	// FOR UPDATE: bloquea la fila hasta el commit. Dos cancelaciones
	// simultáneas de la misma orden se serializan en vez de devolver dos veces
	// el stock.
	const rows = await txQuery<OrderRow>(
		client,
		`select id, patient_id as "patientId", status, total, created_at as "createdAt"
		 from orders where id = $1 for update`,
		[orderId],
	);
	return rows[0] ?? null;
}

export function findOrderItems(
	client: PoolClient,
	orderId: string,
): Promise<OrderItemRow[]> {
	return txQuery<OrderItemRow>(
		client,
		`select medication_id as "medicationId", quantity, unit_price as "unitPrice"
		 from order_items where order_id = $1`,
		[orderId],
	);
}

export async function updateOrderStatus(
	client: PoolClient,
	orderId: string,
	status: OrderStatus,
): Promise<void> {
	await txQuery(
		client,
		`update orders set status = $2::order_status, updated_at = now() where id = $1`,
		[orderId, status],
	);
}

export async function validateAllPrescriptions(
	client: PoolClient,
	orderId: string,
): Promise<number> {
	const rows = await txQuery<{ id: string }>(
		client,
		`update prescriptions
		 set status = 'VALIDATED'
		 where order_id = $1 and status = 'PENDING'
		 returning id`,
		[orderId],
	);
	return rows.length;
}

/** Lectura fuera de transacción: sirve al chequeo de propiedad del dueño. */
export async function findOrderOwner(orderId: string): Promise<string | null> {
	const rows = await query<{ patientId: string }>(
		`select patient_id as "patientId" from orders where id = $1`,
		[orderId],
	);
	return rows[0]?.patientId ?? null;
}
