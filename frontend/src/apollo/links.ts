import { ApolloLink, split } from "@apollo/client/link";
import { HttpLink } from "@apollo/client/link/http";
import { SetContextLink } from "@apollo/client/link/context";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";
import { getToken } from "../lib/session";

const HTTP_URI = import.meta.env.VITE_GRAPHQL_HTTP ?? "http://localhost:4000/graphql";
const WS_URI = import.meta.env.VITE_GRAPHQL_WS ?? "ws://localhost:4000/graphql";

/**
 * Único endpoint HTTP de toda la aplicación.
 * No existe ninguna llamada `fetch` a rutas REST: catálogo, autenticación y
 * pedidos viajan por aquí.
 */
const httpLink = new HttpLink({ uri: HTTP_URI });

/**
 * Inyecta el token en cada operación HTTP.
 *
 * Se lee en el momento de enviar, no al construir el link: así, tras un login
 * las operaciones siguientes ya salen autenticadas sin recrear el cliente.
 */
const authLink = new SetContextLink((prevContext) => {
	const token = getToken();
	return {
		headers: {
			...prevContext.headers,
			...(token ? { authorization: `Bearer ${token}` } : {}),
		},
	};
});

/**
 * WebSocket para las Subscriptions.
 *
 * En WS no hay cabeceras por mensaje: las credenciales viajan una sola vez en
 * el handshake, dentro de `connectionParams`. Es una función para que se
 * evalúe en cada (re)conexión y tome el token vigente.
 */
const wsLink = new GraphQLWsLink(
	createClient({
		url: WS_URI,
		connectionParams: () => {
			const token = getToken();
			return token ? { authorization: `Bearer ${token}` } : {};
		},
		retryAttempts: 5,
	}),
);

/**
 * Enruta por tipo de operación: las subscriptions por WebSocket, el resto por
 * HTTP. Ambos caminos terminan en la misma ruta `/graphql` del servidor.
 */
export const link = split(
	({ query }) => {
		const def = getMainDefinition(query);
		return def.kind === "OperationDefinition" && def.operation === "subscription";
	},
	wsLink,
	ApolloLink.from([authLink, httpLink]),
);
