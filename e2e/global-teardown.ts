import { eq } from "drizzle-orm";
import { db, pool } from "./db";
import { quizzes } from "../src/db/schema";
import { E2E_SHARE_CODE } from "./fixtures";

// Remove the seeded quiz (cascades to questions/attempts) and close the pool so
// the Playwright runner exits cleanly.
export default async function globalTeardown() {
  await db.delete(quizzes).where(eq(quizzes.shareCode, E2E_SHARE_CODE));
  await pool.end();
}
