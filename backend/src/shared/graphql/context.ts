import type { Request } from "express"

export interface AuthUser {
    id: string;
    email: string;
}

/**
 * Lo que recibe TODO resolver como tercer argumento.
 * Se construye de cero en cada request HTTP.
 */
export interface GraphQLContext {
  user: AuthUser | null;
}

export async function createContext({ req }: { req: Request }): Promise<GraphQLContext> {
    return {
        user: null, //Para la fase 3
    };    
}
