import http from "node:http";
import express from "express";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { buildSchema } from "./shared/graphql/buildSchema.js";
import { createContext, type GraphQLContext } from "./shared/graphql/context.js";

export async function createApp() {
    const app= express();
    const httpServer= http.createServer(app);
    
    const apollo= new ApolloServer<GraphQLContext>({
        schema: buildSchema(),
        plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    });

    await apollo.start();

    const allowedOrigins= (process.env.CORS_ORIGIN ?? "http://localhost:5173").split(",");

    //esta es la ÚNICA ruta HTTP de toda la aplicación.
    app.use(
        "/graphql",
        cors({ origin: allowedOrigins}),
        express.json(),
        expressMiddleware(apollo, {context: createContext}),
    );

    return { httpServer, apollo};
}
