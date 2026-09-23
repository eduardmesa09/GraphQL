import type { PoolClient } from "pg";
import { txQuery } from "../db/withTransaction.js";

export const ORDER_PLACED = "OrderPlaced";
export const ORDER_STATUS_CHANGED = "OrderStatusChanged";
export const ORDER_CANCELLED = "OrderCancelled";

export interface DomainEvent<P = Record<string, unknown>> {
	aggregateType: string;
	aggregateId: string;
	eventType: string;
	payload: P;
}

/**
 * Inserta el evento DENTRO de la transacción del comando.
 *
 * Es lo que garantiza que no exista un evento sin su escritura ni una
 * escritura sin su evento: si la transacción revierte, el evento se va con
 * ella. La proyección se dispara después del commit, nunca antes.
 */
export async function recordEvent(
	client: PoolClient,
	event: DomainEvent,
): Promise<void> {
	await txQuery(
		client,
		`insert into domain_events (aggregate_type, aggregate_id, event_type, payload)
		 values ($1, $2, $3, $4::jsonb)`,
		[event.aggregateType, event.aggregateId, event.eventType, JSON.stringify(event.payload)],
	);
}
