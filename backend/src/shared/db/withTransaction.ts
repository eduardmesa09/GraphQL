import type { PoolClient } from "pg";
import { getClient } from "./pool.js";

/**
 * Ejecuta `fn` dentro de una transacción de Postgres.
 *
 * El callback recibe EL CLIENT, no el pool: toda consulta que deba participar
 * de la transacción tiene que usarlo. Si dentro del callback se llama a
 * `query()` del pool, esa consulta sale por otra conexión y queda FUERA de la
 * transacción — sin error, sin aviso.
 */
export async function withTransaction<T>(
	fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
	const client = await getClient();

	try {
		await client.query("BEGIN");
		const result = await fn(client);
		await client.query("COMMIT");
		return result;
	} catch (err) {
		// El rollback no debe enmascarar el error original.
		await client.query("ROLLBACK").catch(() => undefined);
		throw err;
	} finally {
		client.release();
	}
}

/**
 * Equivalente a `query()` del pool pero sobre un client en transacción,
 * con el mismo log `[sql:tx]` para que la evidencia del video sea legible.
 */
export async function txQuery<T>(
	client: PoolClient,
	text: string,
	params?: unknown[],
): Promise<T[]> {
	const start = Date.now();
	const result = await client.query(text, params as never);
	const ms = Date.now() - start;

	if (process.env.NODE_ENV !== "production") {
		console.log(
			`[sql:tx] (${ms}ms, ${result.rowCount} filas) ${text.replace(/\s+/g, " ").trim()}`,
		);
	}

	return result.rows as T[];
}
