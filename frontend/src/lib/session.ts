import { makeVar } from "@apollo/client";

const KEY = "afp.token";

/**
 * Reactive variable de Apollo: cualquier componente que la lea con
 * `useReactiveVar` se vuelve a renderizar cuando cambia. Es el mecanismo de
 * estado local de Apollo, sin necesidad de Redux ni de un Context aparte.
 */
export const tokenVar = makeVar<string | null>(localStorage.getItem(KEY));

export const getToken = () => tokenVar();

export function setToken(token: string | null): void {
	if (token) localStorage.setItem(KEY, token);
	else localStorage.removeItem(KEY);
	tokenVar(token);
}
