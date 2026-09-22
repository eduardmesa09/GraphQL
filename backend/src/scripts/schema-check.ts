import { buildSchema } from "../shared/graphql/buildSchema.js";
import { closePool } from "../shared/db/pool.js";

buildSchema();
console.log("Schema construido. Revisa cackend/schema.graphql");
await closePool();
