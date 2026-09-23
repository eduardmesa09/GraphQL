import DataLoader from "dataloader";
import {
  findCategoriesByIds,
  findLaboratoriesByIds,
  findMedicationsByCategoryIds,
  type CategoryRow,
  type LaboratoryRow,
  type MedicationRow,
} from "../../infra/MedicationReader.js";

export interface CatalogLoaders {
  categoryById: DataLoader<number, CategoryRow>;
  laboratoryById: DataLoader<number, LaboratoryRow>;
  medicationsByCategoryId: DataLoader<number, MedicationRow[]>;
}

/**
 * Se construye UNA VEZ POR REQUEST desde createContext.
 * Nunca a nivel de módulo: la caché debe morir con la request.
 */
export function createCatalogLoaders(): CatalogLoaders {
  return {
    // ─── N:1 — a cada id le corresponde exactamente una fila ───
    categoryById: new DataLoader<number, CategoryRow>(async (ids) => {
      const rows = await findCategoriesByIds(ids);
      const porId = new Map(rows.map((r) => [r.id, r]));

      // El contrato: devolver un resultado por id, EN EL MISMO ORDEN.
      return ids.map(
        (id) => porId.get(id) ?? new Error(`Categoría ${id} no encontrada`),
      );
    }),

    laboratoryById: new DataLoader<number, LaboratoryRow>(async (ids) => {
      const rows = await findLaboratoriesByIds(ids);
      const porId = new Map(rows.map((r) => [r.id, r]));
      return ids.map(
        (id) => porId.get(id) ?? new Error(`Laboratorio ${id} no encontrado`),
      );
    }),

    // ─── 1:N — a cada id le corresponde un array (posiblemente vacío) ───
    medicationsByCategoryId: new DataLoader<number, MedicationRow[]>(async (ids) => {
      const rows = await findMedicationsByCategoryIds(ids);

      // Se siembra el Map con arrays vacíos: una categoría sin medicamentos
      // debe devolver [], no undefined.
      const agrupados = new Map<number, MedicationRow[]>(ids.map((id) => [id, []]));
      for (const row of rows) {
        agrupados.get(row.categoryId)?.push(row);
      }

      return ids.map((id) => agrupados.get(id) ?? []);
    }),
  };
}
