import type { PoolClient } from "pg";
import { query } from "../../../shared/db/pool.js";
import { txQuery } from "../../../shared/db/withTransaction.js";

/** Forma exacta de la fila que devuelve Postgres. price es string: es numeric. */
export interface MedicationRow {
    id: string;
    sku: string;
    name: string;
    activeIngredient: string;
    categoryId: number;
    laboratoryId: number;
    dosage: string;
    presentation: string;
    price: string;
    stock: number;
    requiresPrescription: boolean;
    description: string | null;
}

export interface CategoryRow {
    id: number;
    name: string;
}

export interface LaboratoryRow {
    id: number;
    name: string;
}

export interface MedicationFilterInput {
    search?: string | null;
    categoryId?: string | null;
    requiresPrescription?: boolean | null;
}

/**
 * Único punto donde snake_case de Postgres se traduce a camelCase de GraphQL.
 * Las comillas dobles son obligatorias: sin ellas Postgres pasa el alias a
 * minúsculas y "activeIngredient" llegaría como "activeingredient".
 */
const MEDICATION_COLUMNS= `
  m.id,
  m.sku,
  m.name,
  m.active_ingredient     as "activeIngredient",
  m.category_id           as "categoryId",
  m.laboratory_id         as "laboratoryId",
  m.dosage,
  m.presentation,
  m.price,
  m.stock,
  m.requires_prescription as "requiresPrescription",
  m.description
`;

// ─────────────── Construcción del filtro ───────────────

function buildWhere(filter: MedicationFilterInput) {
    const conditions: string[]= [];
    const params: unknown[]= [];
    const search= filter.search?.trim();

    if (search) {
        params.push(`%${search}%`);
        const p= `$${params.length}`;
        conditions.push(`(
                immutable_unaccent(m.name)             ilike immutable_unaccent(${p})
            or immutable_unaccent(m.active_ingredient) ilike immutable_unaccent(${p})
            or immutable_unaccent(c.name)              ilike immutable_unaccent(${p})
        )`);
    }

    if (filter.categoryId) {
        params.push(Number(filter.categoryId));
        conditions.push(`m.category_id = $${params.length}`);
    }

    if (typeof filter.requiresPrescription === "boolean") {
        params.push(filter.requiresPrescription);
        conditions.push(`m.requires_prescription = $${params.length}`);
    }

    return {
        where: conditions.length ? `where ${conditions.join(" and ")}` : "",
        params,
    };
}

// ─────────────── Lecturas del catálogo ───────────────

export function searchMedications(
    filter: MedicationFilterInput,
    limit: number,
    offset: number,
): Promise<MedicationRow[]> {
    const { where, params } = buildWhere(filter);

    return query<MedicationRow>(
        `select ${MEDICATION_COLUMNS}
        from medications m
        join categories c on c.id = m.category_id
        ${where}
        order by m.name
        limit $${params.length + 1} offset $${params.length + 2}`,
        [...params, limit, offset],
    );
}

export async function countMedications(filter: MedicationFilterInput): Promise<number> {
    const { where, params } = buildWhere(filter);
    const rows= await query<{ total: number }>(
        `select count(*)::int as total
        from medications m
        join categories c on c.id = m.category_id
        ${where}`,
        params,
    );

    return rows[0]?.total ?? 0;
}

export async function findMedicationById(id: string): Promise<MedicationRow | null> {
    const rows= await query<MedicationRow>(
        `select ${MEDICATION_COLUMNS} from medications m where m.id = $1`,
        [id], 
    );

    return rows[0] ?? null;
}

export function findAllCategories(): Promise<CategoryRow[]> {
    return query<CategoryRow>(`select id, name from categories order by name`);
}

// ─────────────── Lecturas por lote (las usará el DataLoader) ───────────────

export function findCategoriesByIds(ids: readonly number[]): Promise<CategoryRow[]> {
  return query<CategoryRow>(
    `select id, name from categories where id = any($1::smallint[])`,
    [ids],
  );
}

export function findLaboratoriesByIds(ids: readonly number[]): Promise<LaboratoryRow[]> {
  return query<LaboratoryRow>(
    `select id, name from laboratories where id = any($1::smallint[])`,
    [ids],
  );
}

export function findMedicationsByCategoryIds(
  ids: readonly number[],
): Promise<MedicationRow[]> {
  return query<MedicationRow>(
    `select ${MEDICATION_COLUMNS}
     from medications m
     where m.category_id = any($1::smallint[])
     order by m.name`,
    [ids],
  );
}

// ─────────── Lectura transaccional para el módulo de pedidos ───────────

export interface MedicationForOrder {
  id: string;
  name: string;
  price: string;
  stock: number;
  requiresPrescription: boolean;
}

/**
 * Datos mínimos que `ordering` necesita para validar y congelar un pedido.
 * Recibe el client de la transacción del comando para leer el mismo estado
 * que luego se va a modificar.
 */
export function findMedicationsForOrder(
  client: PoolClient,
  ids: readonly string[],
): Promise<MedicationForOrder[]> {
  return txQuery<MedicationForOrder>(
    client,
    `select id, name, price, stock, requires_prescription as "requiresPrescription"
     from medications
     where id = any($1::uuid[])`,
    [ids],
  );
}
