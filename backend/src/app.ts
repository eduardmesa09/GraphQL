import http from "node:http";
import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/use/ws";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";

import { buildSchema } from "./shared/graphql/buildSchema.js";
import {
	createContext,
	createWsContext,
	type GraphQLContext,
} from "./shared/graphql/context.js";
import { registerOrderProjections } from "./modules/ordering/index.js";

export async function createApp() {
	const app = express();
	const httpServer = http.createServer(app);
	const schema = buildSchema();

	// Conecta el modelo de escritura con el de lectura: a partir de aquí,
	// cada evento de dominio reproyecta su orden.
	registerOrderProjections();

	// ─── WebSocket para las Subscriptions, sobre el MISMO servidor HTTP ───
	const wsServer = new WebSocketServer({ server: httpServer, path: "/graphql" });
	const wsCleanup = useServer({ schema, context: createWsContext }, wsServer);

	const apollo = new ApolloServer<GraphQLContext>({
		schema,
		plugins: [
			ApolloServerPluginDrainHttpServer({ httpServer }),
			{
				// Cierra los WebSockets abiertos durante el apagado ordenado.
				async serverWillStart() {
					return {
						async drainServer() {
							await wsCleanup.dispose();
						},
					};
				},
			},
		],
	});

	await apollo.start();

	const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173").split(",");

	// Zero-REST: esta es la ÚNICA ruta HTTP de toda la aplicación,
	// y el WebSocket viaja por esa misma ruta.
	app.use(
		"/graphql",
		cors({ origin: allowedOrigins }),
		express.json(),
		expressMiddleware(apollo, { context: createContext }),
	);

	return { httpServer, apollo };
}
