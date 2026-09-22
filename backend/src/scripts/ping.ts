import {query, closePool} from "../shared/db/pool.js";

const rows= await query<{name: string, price: string}>(
    "select name, price from medications order by sku limit 3"
);

console.table(rows);
await closePool();