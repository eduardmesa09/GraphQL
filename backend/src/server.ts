import "dotenv/config";
import { createApp } from "./app.js";
import { closePool } from "./shared/db/pool.js";

const port= Number(process.env.PORT ?? 4000);
const { httpServer, apollo } = await createApp();

httpServer.listen(port, () => {
    console.log(`[server] GraphQL listo en http://localhost:${port}/graphql`)
});

async function shutdown(signal: string) {
    console.log(`[server] ${signal} recibido, cerrando…`);
    await apollo.stop();
    await closePool();
    process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
