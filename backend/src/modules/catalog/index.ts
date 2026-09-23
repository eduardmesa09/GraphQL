import { loadFilesSync } from "@graphql-tools/load-files";
import { catalogResolvers } from "./graphql/catalog.resolvers.js"
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export { createCatalogLoaders, type CatalogLoaders } from "./queries/loaders/catalogLoaders.js";

// Puerto que consume `ordering` para congelar precios y validar recetas.
export {
	findMedicationsForOrder,
	type MedicationForOrder,
} from "./infra/MedicationReader.js";

const here= dirname(fileURLToPath(import.meta.url));

export const catalogModule= {
    name: "catalog",
    typeDefs: loadFilesSync(join(here, "graphql/*.graphql")),
    resolvers: catalogResolvers,
};
