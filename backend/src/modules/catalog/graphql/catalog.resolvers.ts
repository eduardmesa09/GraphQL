import { findMedications } from "../infra/MedicationReader.js";

const LIMIT_MAXIMO= 100;

export const catalogResolvers= {
    Query: {
        medications: async (_parent: unknown, args: { limit?: number}) => {
            const limit= Math.min(Math.max(args.limit ?? 20, 1), LIMIT_MAXIMO);
            return findMedications(limit); 
        },
    },
};
