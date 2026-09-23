import type { GraphQLContext } from "../../../shared/graphql/context.js";

import {
  searchMedications,
  countMedications,
  findMedicationById,
  findAllCategories,
  type MedicationRow,
  type CategoryRow,
  type MedicationFilterInput,
} from "../infra/MedicationReader.js";

const LIMIT_MAXIMO = 100;

interface MedicationsArgs {
  filter?: MedicationFilterInput | null;
  limit?: number | null;
  offset?: number | null;
}

export const catalogResolvers = {
    Query: {
        medications: async (_parent: unknown, args: MedicationsArgs) => {
        const limit = Math.min(Math.max(args.limit ?? 20, 1), LIMIT_MAXIMO);
        const offset = Math.max(args.offset ?? 0, 0);
        const filter = args.filter ?? {};

        // Las dos consultas son independientes: van en paralelo.
        const [items, totalCount] = await Promise.all([
            searchMedications(filter, limit, offset),
            countMedications(filter),
        ]);

        return {
            items,
            totalCount,
            hasMore: offset + items.length < totalCount,
        };
        },

        medication: (_parent: unknown, args: { id: string }) => findMedicationById(args.id),

        categories: () => findAllCategories(),
    },

    Medication: {
        category: (parent: MedicationRow, _args: unknown, ctx: GraphQLContext) =>
            ctx.loaders.catalog.categoryById.load(parent.categoryId),

        laboratory: (parent: MedicationRow, _args: unknown, ctx: GraphQLContext) =>
            ctx.loaders.catalog.laboratoryById.load(parent.laboratoryId),
    },

    Category: {
        medications: (parent: CategoryRow, _args: unknown, ctx: GraphQLContext) =>
            ctx.loaders.catalog.medicationsByCategoryId.load(parent.id),
    },
};
