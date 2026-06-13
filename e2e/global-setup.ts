import { eq } from "drizzle-orm";
import { db } from "./db";
import { questions, quizzes } from "../src/db/schema";
import { E2E_QUIZ, E2E_SHARE_CODE, E2E_USER_ID } from "./fixtures";

// Seed a published quiz with a fixed shareCode and known answers. Idempotent:
// deletes any prior copy (cascades to questions/attempts) so re-runs stay clean
// even if a previous teardown was skipped.
export default async function globalSetup() {
  await db.delete(quizzes).where(eq(quizzes.shareCode, E2E_SHARE_CODE));

  const [quiz] = await db
    .insert(quizzes)
    .values({
      userId: E2E_USER_ID,
      title: E2E_QUIZ.title,
      description: E2E_QUIZ.description,
      randomize: E2E_QUIZ.randomize,
      timeLimit: E2E_QUIZ.timeLimit,
      isPublished: true,
      shareCode: E2E_SHARE_CODE,
    })
    .returning({ id: quizzes.id });

  await db.insert(questions).values(
    E2E_QUIZ.questions.map((q, i) => ({
      quizId: quiz.id,
      prompt: q.prompt,
      optionsJson: JSON.stringify(q.options),
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      sortOrder: i,
    })),
  );
}
