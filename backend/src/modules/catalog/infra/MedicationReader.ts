import { query } from "../../../shared/db/pool.js";

/** Forma exacta de la fila que devuelve Postgres. price es string: es numeric. */
export interface MedicationSummaryrow {
    id: string;
    name: string;
    price: string;
    presentation: string;
}

export function findMedications(limit: number): Promise<MedicationSummaryrow[]> {
    return query<MedicationSummaryrow>(
        `select id, name, price, presentation
         from medications
         order by name
         limit $1`,
        [limit]
    );
}