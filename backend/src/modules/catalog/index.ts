import { loadFilesSync } from "@graphql-tools/load-files";
import { catalogResolvers } from "./graphql/catalog.resolvers.js"
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here= dirname(fileURLToPath(import.meta.url));

export const catalogModule= {
    name: "catalog",
    typeDefs: loadFilesSync(join(here, "graphql/*.graphql")),
    resolvers: catalogResolvers,
};
