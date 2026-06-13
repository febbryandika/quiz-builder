import { eq } from "drizzle-orm";
import { db } from "./db";
import { questions, quizzes } from "../src/db/schema";
import {
  E2E_QUIZ,
  E2E_SHARE_CODE,
  E2E_TIMED_QUIZ,
  E2E_TIMED_SHARE_CODE,
  E2E_USER_ID,
  type E2EQuestion,
} from "./fixtures";

type SeedQuiz = {
  title: string;
  description: string;
  randomize: boolean;
  timeLimit: number | null;
  questions: E2EQuestion[];
};

// Idempotent: delete any prior copy (cascades to questions/attempts) then insert
// the quiz and its ordered questions.
async function seedQuiz(shareCode: string, quiz: SeedQuiz) {
  await db.delete(quizzes).where(eq(quizzes.shareCode, shareCode));

  const [row] = await db
    .insert(quizzes)
    .values({
      userId: E2E_USER_ID,
      title: quiz.title,
      description: quiz.description,
      randomize: quiz.randomize,
      timeLimit: quiz.timeLimit,
      isPublished: true,
      shareCode,
    })
    .returning({ id: quizzes.id });

  await db.insert(questions).values(
    quiz.questions.map((q, i) => ({
      quizId: row.id,
      prompt: q.prompt,
      optionsJson: JSON.stringify(q.options),
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      sortOrder: i,
    })),
  );
}

// Seed both published quizzes used by the player E2E. Re-runs stay clean even if
// a previous teardown was skipped.
export default async function globalSetup() {
  await seedQuiz(E2E_SHARE_CODE, E2E_QUIZ);
  await seedQuiz(E2E_TIMED_SHARE_CODE, E2E_TIMED_QUIZ);
}
