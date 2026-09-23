import { InMemoryCache } from "@apollo/client";

export const cache = new InMemoryCache({
	typePolicies: {
		// El servidor devuelve la orden bajo la clave `id`; normalizarla hace
		// que una actualización llegada por Subscription se propague sola a
		// todas las vistas que la muestran.
		Order: { keyFields: ["id"] },
		Medication: { keyFields: ["id"] },
		Category: { keyFields: ["id"] },

		Query: {
			fields: {
				// Paginación por offset: la página nueva se concatena a la
				// anterior en vez de reemplazarla, y el "Cargar más" funciona
				// sin borrar lo ya pintado.
				medications: {
					keyArgs: ["filter"],
					merge(existing, incoming, { args }) {
						const offset = args?.offset ?? 0;
						const previos = offset === 0 ? [] : (existing?.items ?? []);
						return { ...incoming, items: [...previos, ...incoming.items] };
					},
				},
			},
		},
	},
});
