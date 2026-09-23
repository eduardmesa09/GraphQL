import { loadFilesSync } from "@graphql-tools/load-files";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { identityResolvers } from "./graphql/identity.resolvers.js";

const here = dirname(fileURLToPath(import.meta.url));

export const identityModule = {
  name: "identity",
  typeDefs: loadFilesSync(join(here, "graphql/*.graphql")),
  resolvers: identityResolvers,
};

export { verifyToken } from "./auth/token.js";
