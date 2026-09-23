import type { LoginMutation } from "../graphql/generated";

/** Forma de un error de negocio, tomada del payload generado. */
type UserError = LoginMutation["login"]["errors"][number];

/**
 * Pinta los errores de negocio que devuelve el payload de una mutación.
 *
 * No son excepciones: la operación se ejecutó bien y el servidor respondió
 * "esto no se puede hacer, y este es el motivo", con un código tipado.
 */
export function ErrorList({ errors }: { errors: UserError[] }) {
	if (errors.length === 0) return null;

	return (
		<div className="alert alert-error">
			<strong>No se pudo completar la operación</strong>
			<ul>
				{errors.map((e, i) => (
					<li key={i}>
						{e.message} <code style={{ opacity: .6, fontSize: 11 }}>({e.code})</code>
					</li>
				))}
			</ul>
		</div>
	);
}
