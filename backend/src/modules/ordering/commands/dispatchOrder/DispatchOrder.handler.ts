import { ORDER_STATUS_CHANGED } from "../../../../shared/events/DomainEvent.js";
import { changeOrderStatus, type StatusChangeResult } from "../ChangeStatus.shared.js";
import type { Result } from "../../../../shared/result/Result.js";

export interface DispatchOrderCommand {
	orderId: string;
	patientId: string;
}

/** Despacho: estado final, ya no libera inventario. */
export function dispatchOrder(
	cmd: DispatchOrderCommand,
): Promise<Result<StatusChangeResult>> {
	return changeOrderStatus({
		orderId: cmd.orderId,
		patientId: cmd.patientId,
		target: "DISPATCHED",
		eventType: ORDER_STATUS_CHANGED,
	});
}
