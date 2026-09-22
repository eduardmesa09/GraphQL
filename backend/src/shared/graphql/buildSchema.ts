import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { catalogModule } from "../../modules/catalog/index.js";
//import { orderingModule } from "../../modules/ordering/index.js";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { DateTimeResolver, UUIDResolver } from "graphql-scalars";
import { MoneyScalar } from "./scalars/money.js"
import { writeFileSync } from "node:fs";
import { printSchema } from "graphql";
import { loadFilesSync } from "@graphql-tools/load-files";
import { healthResolver } from "./health.resolver.js";

const here= dirname(fileURLToPath(import.meta.url));
const baseTypeDefs= loadFilesSync(join(here, "base.graphql"));

/**
 * Composition root: qué módulos componen este monolito.
 * `ordering` entra en la Fase 3; `inventory` nunca, es un módulo interno
 * sin superficie GraphQL propia.
 */
const modules= [catalogModule];

export function buildSchema() {
    const schema= makeExecutableSchema({
        typeDefs: [...baseTypeDefs, ...modules.flatMap((m) => m.typeDefs)],
        resolvers: [
            { DateTime: DateTimeResolver, UUID: UUIDResolver, Money: MoneyScalar },
            { Query: { health: healthResolver } },
            ...modules.map((m) => m.resolvers),
        ],
    });

    if (process.env.NODE_ENV !== "production") {
        writeFileSync(join(here, "../../../schema.graphql"), printSchema(schema));
        console.log(
            `[schema] ${modules.length} módulo(s): ${modules.map((m) => m.name).join(", ")}`
        );
    }

    return schema;
}
