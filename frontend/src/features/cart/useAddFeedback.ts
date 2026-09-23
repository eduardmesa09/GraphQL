import { useCallback, useEffect, useRef, useState } from "react";
import { addToCart, type AddableMedication } from "./cartVar";

const DURACION = 1500;

/**
 * Confirmación visual al agregar al carrito.
 *
 * Sin esto el botón parece no hacer nada: la escritura en el carrito es
 * instantánea y local, así que no hay estado de carga que mostrar. El
 * indicador se apaga solo pasado un momento.
 */
export function useAddFeedback() {
	const [agregado, setAgregado] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const agregar = useCallback((med: AddableMedication, cantidad = 1) => {
		addToCart(med, cantidad);
		setAgregado(true);

		// Reinicia la cuenta si se pulsa varias veces seguidas.
		if (timer.current) clearTimeout(timer.current);
		timer.current = setTimeout(() => setAgregado(false), DURACION);
	}, []);

	// Evita actualizar un componente ya desmontado.
	useEffect(() => () => {
		if (timer.current) clearTimeout(timer.current);
	}, []);

	return { agregado, agregar };
}
