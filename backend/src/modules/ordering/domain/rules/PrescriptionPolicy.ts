import type { MedicationForOrder } from "../../../catalog/index.js";

export interface PrescriptionSupport {
	medicationId: string;
	doctorName: string;
	doctorLicense: string;
	issuedAt: string;
	documentUrl?: string | null;
}

export interface MissingPrescription {
	medicationId: string;
	medicationName: string;
}

/**
 * Invariante farmacéutica central del caso de estudio.
 *
 * Un medicamento con `requires_prescription = true` no puede ordenarse sin su
 * soporte de fórmula médica. La regla es una función pura: recibe datos,
 * devuelve incumplimientos. No sabe de SQL, de GraphQL ni de transacciones,
 * por lo que se puede probar de forma aislada y leer como la norma que
 * traduce.
 */
export function findMissingPrescriptions(
	medications: MedicationForOrder[],
	support: PrescriptionSupport[],
): MissingPrescription[] {
	const conSoporte = new Set(support.map((s) => s.medicationId));

	return medications
		.filter((m) => m.requiresPrescription && !conSoporte.has(m.id))
		.map((m) => ({ medicationId: m.id, medicationName: m.name }));
}

/** Valida la forma del soporte médico antes de aceptarlo. */
export function validateSupport(support: PrescriptionSupport): string | null {
	if (!support.doctorName.trim()) return "El nombre del médico es obligatorio";
	if (!support.doctorLicense.trim()) return "El registro médico es obligatorio";
	if (Number.isNaN(Date.parse(support.issuedAt))) return "Fecha de expedición inválida";
	if (new Date(support.issuedAt) > new Date()) return "La fórmula no puede tener fecha futura";
	return null;
}
