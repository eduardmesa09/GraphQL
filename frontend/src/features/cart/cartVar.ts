import { makeVar } from "@apollo/client";
/**
 * Lo mínimo que el carrito necesita de un medicamento.
 *
 * Deliberadamente NO es un tipo generado: así tanto la tarjeta del catálogo
 * (que pide 7 campos) como la ficha (que pide 14) encajan sin conversiones, y
 * el carrito no se acopla a la forma de una query concreta.
 */
export interface AddableMedication {
	id: string;
	name: string;
	presentation: string;
	price: number;
	stock: number;
	requiresPrescription: boolean;
}

export interface CartLine {
	medicationId: string;
	name: string;
	presentation: string;
	price: number;
	quantity: number;
	stock: number;
	requiresPrescription: boolean;
}

const KEY = "afp.cart";

function cargar(): CartLine[] {
	try {
		return JSON.parse(localStorage.getItem(KEY) ?? "[]") as CartLine[];
	} catch {
		return [];
	}
}

/**
 * Carrito como reactive variable de Apollo.
 *
 * Es estado local del cliente, no del servidor: no existe ninguna mutación
 * `addToCart`. El carrito solo se vuelve un hecho del dominio cuando se envía
 * el comando `placeOrder`. Mantenerlo aquí evita un viaje de red por cada
 * clic y deja el modelo de escritura libre de estados intermedios.
 */
export const cartVar = makeVar<CartLine[]>(cargar());

function guardar(lines: CartLine[]): void {
	localStorage.setItem(KEY, JSON.stringify(lines));
	cartVar(lines);
}

export function addToCart(med: AddableMedication, quantity = 1): void {
	const actual = cartVar();
	const existente = actual.find((l) => l.medicationId === med.id);

	if (existente) {
		// Nunca se supera el stock conocido. Es una comodidad de la interfaz:
		// la verdad sobre la disponibilidad la dicta el comando en el servidor.
		const nueva = Math.min(existente.quantity + quantity, med.stock);
		guardar(actual.map((l) => (l.medicationId === med.id ? { ...l, quantity: nueva } : l)));
		return;
	}

	guardar([
		...actual,
		{
			medicationId: med.id,
			name: med.name,
			presentation: med.presentation,
			price: med.price,
			quantity: Math.min(quantity, med.stock),
			stock: med.stock,
			requiresPrescription: med.requiresPrescription,
		},
	]);
}

export function setQuantity(medicationId: string, quantity: number): void {
	if (quantity <= 0) return removeFromCart(medicationId);
	guardar(
		cartVar().map((l) =>
			l.medicationId === medicationId ? { ...l, quantity: Math.min(quantity, l.stock) } : l,
		),
	);
}

export function removeFromCart(medicationId: string): void {
	guardar(cartVar().filter((l) => l.medicationId !== medicationId));
}

export function clearCart(): void {
	guardar([]);
}

export const cartTotal = (lines: CartLine[]) =>
	lines.reduce((acc, l) => acc + l.price * l.quantity, 0);

export const cartCount = (lines: CartLine[]) =>
	lines.reduce((acc, l) => acc + l.quantity, 0);

/** Líneas que exigen soporte de fórmula médica antes de poder ordenar. */
export const requiresRx = (lines: CartLine[]) => lines.filter((l) => l.requiresPrescription);
