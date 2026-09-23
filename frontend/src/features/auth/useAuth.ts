import { useQuery, useReactiveVar } from "@apollo/client/react";
import { ME } from "../../graphql/operations";
import type { MeQuery } from "../../graphql/generated";
import { tokenVar, setToken } from "../../lib/session";
import { client } from "../../apollo/client";

/**
 * Sesión actual.
 *
 * El token vive en una reactive variable; `me` se resuelve contra el servidor
 * y queda en la caché normalizada de Apollo, así que no hay un segundo
 * almacén de estado que mantener sincronizado.
 */
export function useAuth() {
	const token = useReactiveVar(tokenVar);

	const { data, loading } = useQuery<MeQuery>(ME, {
		skip: !token,
		fetchPolicy: "cache-first",
	});

	return {
		token,
		patient: token ? (data?.me ?? null) : null,
		loading: Boolean(token) && loading,

		async signOut() {
			setToken(null);
			// Sin esto quedarían en caché los pedidos del usuario anterior.
			await client.clearStore();
		},
	};
}
