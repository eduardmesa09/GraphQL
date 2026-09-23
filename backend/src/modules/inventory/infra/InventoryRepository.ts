import type { PoolClient } from "pg";
import { txQuery } from "../../../shared/db/withTransaction.js";

/**
 * Reserva atómica.
 *
 * Todo ocurre en UNA sentencia: la condición `stock >= $2` se evalúa y el
 * descuento se aplica bajo el mismo bloqueo de fila que toma Postgres al
 * actualizar. Dos compradores simultáneos del último blíster no pueden ganar
 * los dos: el segundo encuentra `stock` ya descontado y afecta 0 filas.
 *
 * Leer el stock y luego actualizarlo en dos pasos SÍ tendría esa condición de
 * carrera, aunque estuviera dentro de la misma transacción.
 *
 * Devuelve true si logró reservar.
 */
export async function reserveStock(
	client: PoolClient,
	medicationId: string,
	quantity: number,
): Promise<boolean> {
	const rows = await txQuery<{ stock: number }>(
		client,
		`update medications
		 set stock = stock - $2
		 where id = $1 and stock >= $2
		 returning stock`,
		[medicationId, quantity],
	);

	return rows.length === 1;
}

/** Devuelve unidades al inventario (cancelación de una orden). */
export async function releaseStock(
	client: PoolClient,
	medicationId: string,
	quantity: number,
): Promise<void> {
	await txQuery(
		client,
		`update medications set stock = stock + $2 where id = $1`,
		[medicationId, quantity],
	);
}
