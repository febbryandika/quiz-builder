// Structured result for Server Actions: actions return, never throw to the
// client. Error matches the inner shape of SPEC §5.3 — see src/lib/api.ts
// for the Route Handler twin.
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export function fail(code: string, message: string): ActionResult<never> {
  return { ok: false, error: { code, message } };
}
