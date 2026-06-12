import { avg, count, desc, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { quizzes, questions, attempts } from "@/db/schema";

// ---------------------------------------------------------------------------
// Public types (SPEC §5)
// ---------------------------------------------------------------------------

export type QuizListItem = {
  id: string;
  title: string;
  description: string | null;
  timeLimit: number | null;
  randomize: boolean;
  isPublished: boolean;
  shareCode: string;
  createdAt: Date;
  attemptCount: number;
  // fractions 0–1; null iff attemptCount === 0
  averageScore: number | null;
  completionRate: number | null;
};

export type QuizDetail = {
  id: string;
  title: string;
  description: string | null;
  timeLimit: number | null;
  randomize: boolean;
  isPublished: boolean;
  shareCode: string;
  createdAt: Date;
  questions: {
    id: string;
    prompt: string;
    options: string[];
    correctIndex: number;
    explanation: string | null;
    sortOrder: number;
  }[];
};

// Public shape: no correctIndex/explanation/userId/isPublished
export type PublicQuiz = {
  id: string;
  title: string;
  description: string | null;
  timeLimit: number | null;
  randomize: boolean;
  shareCode: string;
  questions: {
    id: string;
    prompt: string;
    options: string[];
  }[];
};

// ---------------------------------------------------------------------------
// Pure mappers
// ---------------------------------------------------------------------------

// Maps a raw SQL aggregate row to QuizListItem
export function toQuizListItem(row: {
  id: string;
  title: string;
  description: string | null;
  timeLimit: number | null;
  randomize: boolean;
  isPublished: boolean;
  shareCode: string;
  createdAt: Date;
  attemptCount: number;
  avgScoreRatio: string | null;
  completedCount: number;
}): QuizListItem {
  const attemptCount = row.attemptCount;
  const averageScore =
    row.avgScoreRatio === null ? null : Number(row.avgScoreRatio);
  const completionRate =
    attemptCount > 0 ? row.completedCount / attemptCount : null;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    timeLimit: row.timeLimit,
    randomize: row.randomize,
    isPublished: row.isPublished,
    shareCode: row.shareCode,
    createdAt: row.createdAt,
    attemptCount,
    averageScore,
    completionRate,
  };
}

// Explicit ALLOWLIST mapper — construct field by field; never spread/delete/omit
export function toPublicQuiz(quiz: QuizDetail): PublicQuiz {
  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    timeLimit: quiz.timeLimit,
    randomize: quiz.randomize,
    shareCode: quiz.shareCode,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options,
    })),
  };
}

// ---------------------------------------------------------------------------
// DB read helpers
// ---------------------------------------------------------------------------

// Shared helper: fetch ordered questions for a quiz and build QuizDetail
async function loadQuizDetail(
  quiz: typeof quizzes.$inferSelect,
): Promise<QuizDetail> {
  const rows = await db
    .select()
    .from(questions)
    .where(eq(questions.quizId, quiz.id))
    .orderBy(asc(questions.sortOrder));

  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    timeLimit: quiz.timeLimit,
    randomize: quiz.randomize,
    isPublished: quiz.isPublished,
    shareCode: quiz.shareCode,
    createdAt: quiz.createdAt,
    questions: rows.map((row) => ({
      id: row.id,
      prompt: row.prompt,
      options: JSON.parse(row.optionsJson) as string[],
      correctIndex: row.correctIndex,
      explanation: row.explanation,
      sortOrder: row.sortOrder,
    })),
  };
}

// Returns user's quiz list with attempt stats (single grouped left join)
export async function getUserQuizList(userId: string): Promise<QuizListItem[]> {
  const rows = await db
    .select({
      id: quizzes.id,
      title: quizzes.title,
      description: quizzes.description,
      timeLimit: quizzes.timeLimit,
      randomize: quizzes.randomize,
      isPublished: quizzes.isPublished,
      shareCode: quizzes.shareCode,
      createdAt: quizzes.createdAt,
      attemptCount: count(attempts.id),
      avgScoreRatio: avg(sql`${attempts.score}::float / ${attempts.total}`),
      completedCount: count(attempts.submittedAt),
    })
    .from(quizzes)
    .leftJoin(attempts, eq(attempts.quizId, quizzes.id))
    .where(eq(quizzes.userId, userId))
    .groupBy(quizzes.id)
    .orderBy(desc(quizzes.createdAt));

  return rows.map(toQuizListItem);
}

// Returns quiz detail for the editor — includes answers; null = missing OR non-owner
export async function getQuizForEditor(
  id: string,
  userId: string,
): Promise<QuizDetail | null> {
  const quiz = await db.query.quizzes.findFirst({
    where: eq(quizzes.id, id),
  });
  if (!quiz || quiz.userId !== userId) return null;
  return loadQuizDetail(quiz);
}

// Returns published quiz (keeps correctIndex/explanation for server-side scoring);
// null = missing OR unpublished
export async function getPublishedQuiz(
  shareCode: string,
): Promise<QuizDetail | null> {
  const quiz = await db.query.quizzes.findFirst({
    where: eq(quizzes.shareCode, shareCode),
  });
  if (!quiz || !quiz.isPublished) return null;
  return loadQuizDetail(quiz);
}
