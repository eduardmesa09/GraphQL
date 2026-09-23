import { ApolloClient } from "@apollo/client";
import { link } from "./links";
import { cache } from "./cache";

export const client = new ApolloClient({
	link,
	cache,
	devtools: { enabled: true },
});
