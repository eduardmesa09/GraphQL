import type { PrescriptionSupport } from "../../domain/rules/PrescriptionPolicy.js";

export interface OrderItemCommand {
	medicationId: string;
	quantity: number;
}

/**
 * Intención de negocio, no una fila de base de datos.
 *
 * Nótese lo que NO trae: ni precios (los fija el servidor con el catálogo del
 * momento), ni total (se calcula), ni estado (lo decide la invariante), ni
 * patientId (viene de la sesión autenticada). Un comando expresa lo que el
 * usuario quiere, no cómo queda el sistema.
 */
export interface PlaceOrderCommand {
	patientId: string;
	items: OrderItemCommand[];
	prescriptions: PrescriptionSupport[];
}
