import { makeVar } from "@apollo/client";

export type AuthMode = "login" | "registro";

/**
 * Qué modal de autenticación está abierto, o null si ninguno.
 *
 * Es una reactive variable y no un estado de React para que cualquier
 * componente pueda abrirlo sin pasar props ni levantar el estado: el header,
 * el checkout y la lista de pedidos lo invocan desde sitios distintos del
 * árbol.
 */
export const authModalVar = makeVar<AuthMode | null>(null);

export const openAuth = (mode: AuthMode = "login") => authModalVar(mode);
export const closeAuth = () => authModalVar(null);
