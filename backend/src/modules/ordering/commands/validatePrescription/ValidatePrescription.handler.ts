import { ORDER_STATUS_CHANGED } from "../../../../shared/events/DomainEvent.js";
import { changeOrderStatus, type StatusChangeResult } from "../ChangeStatus.shared.js";
import type { Result } from "../../../../shared/result/Result.js";

export interface ValidatePrescriptionCommand {
	orderId: string;
	patientId: string;
}

/**
 * Simula la revisión farmacéutica: marca las fórmulas como validadas y
 * aprueba la orden. En un sistema real este comando lo ejecutaría un
 * farmaceuta con su propio rol, no el paciente.
 */
export function validatePrescription(
	cmd: ValidatePrescriptionCommand,
): Promise<Result<StatusChangeResult>> {
	return changeOrderStatus({
		orderId: cmd.orderId,
		patientId: cmd.patientId,
		target: "APPROVED",
		eventType: ORDER_STATUS_CHANGED,
		validatePrescriptions: true,
	});
}
