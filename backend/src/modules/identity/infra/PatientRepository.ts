import { query } from "../../../shared/db/pool.js";

export interface PatientRow {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
}

const COLUMNS = `id, email, full_name as "fullName", password_hash as "passwordHash"`;

export async function findPatientByEmail(email: string): Promise<PatientRow | null> {
  const rows = await query<PatientRow>(
    `select ${COLUMNS} from patients where lower(email) = lower($1)`,
    [email],
  );
  return rows[0] ?? null;
}

export async function findPatientById(id: string): Promise<PatientRow | null> {
  const rows = await query<PatientRow>(`select ${COLUMNS} from patients where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function insertPatient(
  email: string,
  fullName: string,
  passwordHash: string,
): Promise<PatientRow> {
  const rows = await query<PatientRow>(
    `insert into patients (email, full_name, password_hash)
     values (lower($1), $2, $3)
     returning ${COLUMNS}`,
    [email, fullName, passwordHash],
  );
  return rows[0]!;
}
