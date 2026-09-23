export type ErrorCode =
  | "VALIDATION"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "OUT_OF_STOCK"
  | "PRESCRIPTION_REQUIRED"
  | "PRESCRIPTION_INVALID"
  | "CONFLICT";

export interface UserErrorShape {
  field?: string | null;
  message: string;
  code: ErrorCode;
}

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; errors: UserErrorShape[] };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });

export const fail = <T>(...errors: UserErrorShape[]): Result<T> => ({
  ok: false,
  errors,
});
