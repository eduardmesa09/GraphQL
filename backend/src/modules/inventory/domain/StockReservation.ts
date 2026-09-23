/**
 * Una línea de reserva: cuántas unidades de un medicamento se quieren apartar.
 */
export interface StockReservation {
	medicationId: string;
	quantity: number;
}

export interface ReservationFailure {
	medicationId: string;
	requested: number;
	available: number;
}
