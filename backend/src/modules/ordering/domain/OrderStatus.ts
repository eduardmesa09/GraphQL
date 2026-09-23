/** Debe coincidir con el enum `order_status` de Postgres y con el SDL. */
export const ORDER_STATUSES = [
	"PENDING_APPROVAL",
	"APPROVED",
	"DISPATCHED",
	"CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Transiciones permitidas. Cualquier otra es un error de negocio. */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
	PENDING_APPROVAL: ["APPROVED", "CANCELLED"],
	APPROVED: ["DISPATCHED", "CANCELLED"],
	DISPATCHED: [],
	CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
	return TRANSITIONS[from].includes(to);
}

/** Una orden despachada o cancelada ya no libera ni consume inventario. */
export function isFinal(status: OrderStatus): boolean {
	return status === "DISPATCHED" || status === "CANCELLED";
}
