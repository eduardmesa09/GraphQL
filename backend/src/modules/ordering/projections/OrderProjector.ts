import { query } from "../../../shared/db/pool.js";
import { pubsub, orderTopic } from "../../../shared/events/pubsub.js";
import { eventBus } from "../../../shared/events/EventBus.js";
import {
	ORDER_PLACED,
	ORDER_STATUS_CHANGED,
	ORDER_CANCELLED,
	type DomainEvent,
} from "../../../shared/events/DomainEvent.js";

/**
 * Retardo artificial de la proyección, en milisegundos.
 *
 * Existe para poder DEMOSTRAR la consistencia eventual: con
 * PROJECTION_DELAY_MS=1500 se ve cómo la UI muestra el estado optimista y
 * cómo la Subscription lo corrige cuando la proyección termina. En 0 el
 * sistema se comporta de forma normal.
 */
const DELAY = Number(process.env.PROJECTION_DELAY_MS ?? 0);

/**
 * Reconstruye la proyección de una orden a partir del modelo de escritura.
 *
 * Es idempotente: proyectar dos veces el mismo pedido da el mismo resultado.
 * Por eso puede reintentarse sin miedo y por eso un evento duplicado no
 * corrompe el modelo de lectura.
 */
export async function projectOrder(orderId: string): Promise<void> {
	if (DELAY > 0) await new Promise((r) => setTimeout(r, DELAY));

	await query(
		`insert into read_model.order_projections (
		   order_id, patient_id, status, total, item_count, items,
		   pending_prescriptions, placed_at, projected_at
		 )
		 select
		   o.id,
		   o.patient_id,
		   o.status::text,
		   o.total,
		   (select count(*)::int from order_items oi where oi.order_id = o.id),
		   coalesce((
		     select jsonb_agg(
		              jsonb_build_object(
		                'medicationId', oi.medication_id,
		                'name',         m.name,
		                'presentation', m.presentation,
		                'quantity',     oi.quantity,
		                'unitPrice',    oi.unit_price,
		                'lineTotal',    oi.unit_price * oi.quantity
		              ) order by m.name
		            )
		     from order_items oi
		     join medications m on m.id = oi.medication_id
		     where oi.order_id = o.id
		   ), '[]'::jsonb),
		   exists(
		     select 1 from prescriptions p
		     where p.order_id = o.id and p.status = 'PENDING'
		   ),
		   o.created_at,
		   now()
		 from orders o
		 where o.id = $1
		 on conflict (order_id) do update set
		   status                = excluded.status,
		   total                 = excluded.total,
		   item_count            = excluded.item_count,
		   items                 = excluded.items,
		   pending_prescriptions = excluded.pending_prescriptions,
		   projected_at          = now()`,
		[orderId],
	);

	// La proyección ya está al día: recién ahora se avisa a los suscriptores.
	const rows = await query<{ status: string }>(
		`select status from read_model.order_projections where order_id = $1`,
		[orderId],
	);

	console.log(`[projection] orden ${orderId} proyectada (${rows[0]?.status})`);

	await pubsub.publish(orderTopic(orderId), { orderId });
}

/** Suscribe el proyector a los eventos que invalidan la vista de una orden. */
export function registerOrderProjections(): void {
	const handler = (event: DomainEvent) => projectOrder(event.aggregateId);

	eventBus.on(ORDER_PLACED, handler);
	eventBus.on(ORDER_STATUS_CHANGED, handler);
	eventBus.on(ORDER_CANCELLED, handler);
}
