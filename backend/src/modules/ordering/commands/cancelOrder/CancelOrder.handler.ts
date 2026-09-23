import { ORDER_CANCELLED } from "../../../../shared/events/DomainEvent.js";
import { changeOrderStatus, type StatusChangeResult } from "../ChangeStatus.shared.js";
import type { Result } from "../../../../shared/result/Result.js";

export interface CancelOrderCommand {
	orderId: string;
	patientId: string;
}

/** Cancela la orden y DEVUELVE el inventario reservado. */
export function cancelOrder(cmd: CancelOrderCommand): Promise<Result<StatusChangeResult>> {
	return changeOrderStatus({
		orderId: cmd.orderId,
		patientId: cmd.patientId,
		target: "CANCELLED",
		eventType: ORDER_CANCELLED,
		releaseInventory: true,
	});
}
