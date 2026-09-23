import { loadFilesSync } from "@graphql-tools/load-files";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { orderingResolvers } from "./graphql/ordering.resolvers.js";

const here = dirname(fileURLToPath(import.meta.url));

export const orderingModule = {
	name: "ordering",
	typeDefs: loadFilesSync(join(here, "graphql/*.graphql")),
	resolvers: orderingResolvers,
};

export { registerOrderProjections } from "./projections/OrderProjector.js";
