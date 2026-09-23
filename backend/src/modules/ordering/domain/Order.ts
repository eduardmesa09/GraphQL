import type { OrderStatus } from "./OrderStatus.js";

export interface OrderLine {
	medicationId: string;
	quantity: number;
	/** Precio congelado en el momento de ordenar. */
	unitPrice: number;
}

export interface Order {
	id: string;
	patientId: string;
	status: OrderStatus;
	total: number;
	lines: OrderLine[];
	createdAt: Date;
}

/**
 * El total es una función de las líneas, no un dato que se guarda aparte y
 * puede desincronizarse. Se calcula en centavos para no arrastrar errores de
 * punto flotante al sumar.
 */
export function calculateTotal(lines: OrderLine[]): number {
	const centavos = lines.reduce(
		(acc, l) => acc + Math.round(l.unitPrice * 100) * l.quantity,
		0,
	);
	return centavos / 100;
}
