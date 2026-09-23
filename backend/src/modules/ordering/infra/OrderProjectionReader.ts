import { query } from "../../../shared/db/pool.js";

export interface ProjectedItem {
	medicationId: string;
	name: string;
	presentation: string;
	quantity: number;
	unitPrice: string;
	lineTotal: string;
}

export interface OrderProjectionRow {
	orderId: string;
	patientId: string;
	status: string;
	total: string;
	itemCount: number;
	items: ProjectedItem[];
	pendingPrescriptions: boolean;
	placedAt: Date;
	projectedAt: Date;
}

const COLUMNS = `
  order_id              as "orderId",
  patient_id            as "patientId",
  status,
  total,
  item_count            as "itemCount",
  items,
  pending_prescriptions as "pendingPrescriptions",
  placed_at             as "placedAt",
  projected_at          as "projectedAt"
`;

/**
 * Lectura del modelo de consulta: una tabla, cero joins, total ya calculado.
 * Compárese con lo que costaría armar esta misma vista desde `orders`,
 * `order_items`, `medications` y `prescriptions`.
 */
export async function findProjectionById(
	orderId: string,
): Promise<OrderProjectionRow | null> {
	const rows = await query<OrderProjectionRow>(
		`select ${COLUMNS} from read_model.order_projections where order_id = $1`,
		[orderId],
	);
	return rows[0] ?? null;
}

export function findProjectionsByPatient(
	patientId: string,
	limit: number,
	offset: number,
): Promise<OrderProjectionRow[]> {
	return query<OrderProjectionRow>(
		`select ${COLUMNS}
		 from read_model.order_projections
		 where patient_id = $1
		 order by placed_at desc
		 limit $2 offset $3`,
		[patientId, limit, offset],
	);
}

export async function countProjectionsByPatient(patientId: string): Promise<number> {
	const rows = await query<{ total: number }>(
		`select count(*)::int as total
		 from read_model.order_projections where patient_id = $1`,
		[patientId],
	);
	return rows[0]?.total ?? 0;
}
