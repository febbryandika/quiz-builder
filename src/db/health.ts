import { sql } from "drizzle-orm";
import { db } from "./index";

type DbHealth = { healthy: true } | { healthy: false; error: string };

// Drizzle wraps driver errors; the useful detail (e.g. ECONNREFUSED) is on
// cause — which for connection failures is an AggregateError whose own
// message is empty and whose detail sits in the inner errors.
function errorMessage(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause;
  if (cause instanceof AggregateError && cause.errors.length > 0) {
    return cause.errors
      .map((inner) => (inner instanceof Error ? inner.message : String(inner)))
      .join("; ");
  }
  if (cause instanceof Error && cause.message) return cause.message;
  return error.message;
}

export async function checkDbHealth(): Promise<DbHealth> {
  try {
    await db.execute(sql`select 1`);
    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: errorMessage(error) };
  }
}
