import "dotenv/config";
import { Pool } from "pg";
import type { QueryResult, QueryResultRow, PoolClient } from "pg";

const connectionString= process.env.DATABASE_URL;

if(!connectionString) {
    throw new Error(
        "DATABASE_URL no está definida. Copia .env.example a .env y pega el " + 
        "Session Pooler URI de Supabasse."
    )
}

export const pool= new Pool({
    connectionString,
    ssl: {rejectUnauthorized: false},
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
});

pool.on("error", (err) => {
    console.error("[db] error en cliente inactivo", err);
});

export async function query<T extends QueryResultRow>(
    text: string, 
    params?: unknown[]
): Promise<T[]> {
    const start= Date.now();
    const result: QueryResult<T>= await pool.query<T>(text, params);
    const ms= Date.now() - start;
    
    if(process.env.NODE_ENV !== "production") {
        const sql= text.replace(/\s+/g, " ").trim(); //colapsa los saltos de línea de los queries multilínea a una sola
        console.log(`[sql] (${ms}ms, ${result.rowCount} filas) ${sql}`);
    }

    return result.rows;
}

export function getClient(): Promise<PoolClient> {
    return pool.connect();
}

export async function closePool() {
    await pool.end();
}
