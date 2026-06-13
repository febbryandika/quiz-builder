import { inArray, like } from "drizzle-orm";
import { db, pool } from "./db";
import { quizzes, user } from "../src/db/schema";
import {
  E2E_FOREIGN_SHARE_CODE,
  E2E_SHARE_CODE,
  E2E_TIMED_SHARE_CODE,
} from "./fixtures";
import { E2E_USER_EMAIL_PREFIX } from "./auth";

// Remove the seeded quizzes (cascades to questions/attempts), delete any users
// created by the authenticated specs along with the quizzes they made, and close
// the pool so the Playwright runner exits cleanly.
export default async function globalTeardown() {
  await db
    .delete(quizzes)
    .where(
      inArray(quizzes.shareCode, [
        E2E_SHARE_CODE,
        E2E_TIMED_SHARE_CODE,
        E2E_FOREIGN_SHARE_CODE,
      ]),
    );

  // Quizzes created by test users don't cascade from the user (quizzes.userId
  // has no FK), so delete them by owner id before removing the users.
  const testUsers = await db
    .select({ id: user.id })
    .from(user)
    .where(like(user.email, `${E2E_USER_EMAIL_PREFIX}%`));
  const ids = testUsers.map((u) => u.id);
  if (ids.length) {
    await db.delete(quizzes).where(inArray(quizzes.userId, ids));
  }
  // Deleting the user cascades to its session/account rows.
  await db.delete(user).where(like(user.email, `${E2E_USER_EMAIL_PREFIX}%`));

  await pool.end();
}
