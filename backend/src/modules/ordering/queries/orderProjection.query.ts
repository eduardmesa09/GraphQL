import {
	findProjectionById,
	findProjectionsByPatient,
	countProjectionsByPatient,
	type OrderProjectionRow,
} from "../infra/OrderProjectionReader.js";

/** Forma que espera el tipo `Order` del SDL. */
export interface OrderView {
	id: string;
	status: string;
	total: string;
	itemCount: number;
	items: OrderProjectionRow["items"];
	pendingPrescriptions: boolean;
	placedAt: Date;
	projectedAt: Date;
}

function toView(row: OrderProjectionRow): OrderView {
	return {
		id: row.orderId,
		status: row.status,
		total: row.total,
		itemCount: row.itemCount,
		items: row.items,
		pendingPrescriptions: row.pendingPrescriptions,
		placedAt: row.placedAt,
		projectedAt: row.projectedAt,
	};
}

/**
 * Devuelve la proyección solo si pertenece al paciente.
 *
 * El filtro de propiedad va aquí, en la consulta, y no en el resolver: así
 * ninguna ruta de lectura puede olvidarlo.
 */
export async function getOrderForPatient(
	orderId: string,
	patientId: string,
): Promise<OrderView | null> {
	const row = await findProjectionById(orderId);
	if (!row || row.patientId !== patientId) return null;
	return toView(row);
}

export async function listOrdersForPatient(
	patientId: string,
	limit: number,
	offset: number,
): Promise<{ items: OrderView[]; totalCount: number; hasMore: boolean }> {
	const [rows, totalCount] = await Promise.all([
		findProjectionsByPatient(patientId, limit, offset),
		countProjectionsByPatient(patientId),
	]);

	return {
		items: rows.map(toView),
		totalCount,
		hasMore: offset + rows.length < totalCount,
	};
}
