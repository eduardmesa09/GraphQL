import type { UserErrorShape } from "../../../shared/result/Result.js";

/**
 * Señal interna para abortar una transacción por una regla de negocio.
 *
 * El problema que resuelve: `withTransaction` solo revierte si el callback
 * lanza, pero un incumplimiento de negocio no es una excepción — debe volver
 * como `Result` tipado. Se lanza esta señal para forzar el ROLLBACK y se
 * captura justo afuera para convertirla en `fail(...)`.
 */
export class BusinessRollback extends Error {
	constructor(readonly errors: UserErrorShape[]) {
		super("business-rollback");
		this.name = "BusinessRollback";
	}
}
