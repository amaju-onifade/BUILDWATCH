/**
 * Standardized Result pattern for handling operational errors.
 * Used in business logic functions to avoid throwing exceptions.
 */

export type Result<T, E = string> =
  | { ok: true; data: T }
  | { ok: false; error: E; code?: string }

/**
 * Returns a successful result.
 */
export function ok<T>(data: T): Result<T> {
  return { ok: true, data }
}

/**
 * Returns an error result.
 */
export function err<T>(error: string, code?: string): Result<T> {
  return { ok: false, error, code }
}
