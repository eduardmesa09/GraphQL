import { query } from "../db/pool.js"

export async function healthResolver() {
    let database= false;

    try {
        await query<{ ok: number }>("select 1 as ok");
        database= true;

    }catch (err) {
        console.error("[health] Supabase no responde: ", err);
    }

    return {
        ok: database,
        database,
        Timestamp: new Date(),
    };
}
