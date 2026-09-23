import type { Request } from "express";
import { verifyToken } from "../../modules/identity/index.js";
import {
	createCatalogLoaders,
	type CatalogLoaders,
} from "../../modules/catalog/index.js";

export interface AuthUser {
	id: string;
	email: string;
}

export interface GraphQLContext {
	user: AuthUser | null;
	loaders: {
		catalog: CatalogLoaders;
	};
}

/** Extrae el usuario de un token "Bearer ..." sin consultar la base de datos. */
function userFromHeader(header: string | undefined): AuthUser | null {
	const raw = header ?? "";
	const token = raw.startsWith("Bearer ") ? raw.slice(7) : null;
	const payload = token ? verifyToken(token) : null;
	return payload ? { id: payload.sub, email: payload.email } : null;
}

function buildContext(user: AuthUser | null): GraphQLContext {
	return {
		user,
		// Loaders nuevos en cada operación: la caché vive una request y muere
		// con ella.
		loaders: { catalog: createCatalogLoaders() },
	};
}

/** Contexto de las operaciones HTTP (queries y mutations). */
export async function createContext({ req }: { req: Request }): Promise<GraphQLContext> {
	return buildContext(userFromHeader(req.headers.authorization));
}

/**
 * Contexto de las Subscriptions.
 *
 * En WebSocket no hay cabeceras por mensaje: el cliente envía sus credenciales
 * una sola vez, en el `connectionParams` del handshake. Apollo Client las
 * manda desde la opción `connectionParams` de su GraphQLWsLink.
 */
export async function createWsContext(ctx: {
	connectionParams?: Record<string, unknown> | undefined;
}): Promise<GraphQLContext> {
	const params = ctx.connectionParams ?? {};
	const header =
		(params.authorization as string | undefined) ??
		(params.Authorization as string | undefined);

	return buildContext(userFromHeader(header));
}
