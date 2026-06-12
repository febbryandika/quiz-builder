"use server";

import { revalidatePath } from "next/cache";
import { count, eq, max } from "drizzle-orm";
import { db } from "@/db";
import { questions, quizzes } from "@/db/schema";
import { type ActionResult, fail } from "@/lib/action-result";
import { getSession } from "@/lib/session";
import {
  idSchema,
  questionSchema,
  updateQuestionSchema,
  reorderQuestionsSchema,
  MAX_QUESTIONS_PER_QUIZ,
  type QuestionInput,
  type UpdateQuestionInput,
  type ReorderQuestionsInput,
} from "@/lib/validations";

// Non-exported helper: fetch a quiz and verify ownership in one place.
// Returns null when the quiz is missing OR the caller is not the owner —
// callers must return NOT_FOUND without disclosing which case fired (SPEC §7).
async function getOwnedQuiz(quizId: string, userId: string) {
  const quiz = await db.query.quizzes.findFirst({
    where: eq(quizzes.id, quizId),
  });
  return !quiz || quiz.userId !== userId ? null : quiz;
}

export async function addQuestion(
  quizId: string,
  input: QuestionInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await getSession();
    if (!session) return fail("UNAUTHORIZED", "You must be signed in");

    const parsedId = idSchema.safeParse(quizId);
    if (!parsedId.success)
      return fail(
        "VALIDATION_ERROR",
        parsedId.error.issues[0]?.message ?? "Invalid input",
      );
    const parsed = questionSchema.safeParse(input);
    if (!parsed.success)
      return fail(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid input",
      );

    console.info("[actions/question] addQuestion", {
      userId: session.user.id,
      quizId: parsedId.data,
    });

    const quiz = await getOwnedQuiz(parsedId.data, session.user.id);
    if (!quiz) return fail("NOT_FOUND", "Quiz not found");

    // Single aggregate: cap check + next sortOrder in one round-trip.
    // max+1 (not count+1) so gaps left by deletes never cause collisions.
    const [agg] = await db
      .select({ count: count(), maxSort: max(questions.sortOrder) })
      .from(questions)
      .where(eq(questions.quizId, quiz.id));

    if (agg.count >= MAX_QUESTIONS_PER_QUIZ)
      return fail("VALIDATION_ERROR", "A quiz can have at most 50 questions");

    const sortOrder = (agg.maxSort ?? -1) + 1;

    const [created] = await db
      .insert(questions)
      .values({
        quizId: quiz.id,
        prompt: parsed.data.prompt,
        optionsJson: JSON.stringify(parsed.data.options),
        correctIndex: parsed.data.correctIndex,
        explanation: parsed.data.explanation,
        sortOrder,
      })
      .returning({ id: questions.id });

    revalidatePath("/dashboard");
    revalidatePath(`/quizzes/${quiz.id}/edit`);
    revalidatePath(`/q/${quiz.shareCode}`);
    revalidatePath(`/api/public/quiz/${quiz.shareCode}`); // invalidate cached route handler
    return { ok: true, data: { id: created.id } };
  } catch (error) {
    console.error("[actions/question] addQuestion failed", error);
    return fail("INTERNAL", "Something went wrong. Please try again.");
  }
}

export async function updateQuestion(
  questionId: string,
  input: UpdateQuestionInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await getSession();
    if (!session) return fail("UNAUTHORIZED", "You must be signed in");

    const parsedId = idSchema.safeParse(questionId);
    if (!parsedId.success)
      return fail(
        "VALIDATION_ERROR",
        parsedId.error.issues[0]?.message ?? "Invalid input",
      );
    const parsed = updateQuestionSchema.safeParse(input);
    if (!parsed.success)
      return fail(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid input",
      );

    console.info("[actions/question] updateQuestion", {
      userId: session.user.id,
      questionId: parsedId.data,
    });

    const question = await db.query.questions.findFirst({
      where: eq(questions.id, parsedId.data),
    });
    if (!question) return fail("NOT_FOUND", "Question not found");

    const quiz = await getOwnedQuiz(question.quizId, session.user.id);
    if (!quiz) return fail("NOT_FOUND", "Question not found");

    // Explicit field mapping: options → optionsJson rename means we cannot
    // spread parsed.data directly. No _-prefix destructuring (past lint failure).
    const patch: Partial<typeof questions.$inferInsert> = {};
    if (parsed.data.prompt !== undefined) patch.prompt = parsed.data.prompt;
    if (parsed.data.options !== undefined)
      patch.optionsJson = JSON.stringify(parsed.data.options);
    if (parsed.data.correctIndex !== undefined)
      patch.correctIndex = parsed.data.correctIndex;
    if (parsed.data.explanation !== undefined)
      patch.explanation = parsed.data.explanation;

    await db.update(questions).set(patch).where(eq(questions.id, question.id));

    revalidatePath("/dashboard");
    revalidatePath(`/quizzes/${quiz.id}/edit`);
    revalidatePath(`/q/${quiz.shareCode}`);
    revalidatePath(`/api/public/quiz/${quiz.shareCode}`); // invalidate cached route handler
    return { ok: true, data: { id: question.id } };
  } catch (error) {
    console.error("[actions/question] updateQuestion failed", error);
    return fail("INTERNAL", "Something went wrong. Please try again.");
  }
}

export async function deleteQuestion(
  questionId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await getSession();
    if (!session) return fail("UNAUTHORIZED", "You must be signed in");

    const parsedId = idSchema.safeParse(questionId);
    if (!parsedId.success)
      return fail(
        "VALIDATION_ERROR",
        parsedId.error.issues[0]?.message ?? "Invalid input",
      );

    console.info("[actions/question] deleteQuestion", {
      userId: session.user.id,
      questionId: parsedId.data,
    });

    const question = await db.query.questions.findFirst({
      where: eq(questions.id, parsedId.data),
    });
    if (!question) return fail("NOT_FOUND", "Question not found");

    const quiz = await getOwnedQuiz(question.quizId, session.user.id);
    if (!quiz) return fail("NOT_FOUND", "Question not found");

    await db.delete(questions).where(eq(questions.id, question.id));

    revalidatePath("/dashboard");
    revalidatePath(`/quizzes/${quiz.id}/edit`);
    revalidatePath(`/q/${quiz.shareCode}`);
    revalidatePath(`/api/public/quiz/${quiz.shareCode}`); // invalidate cached route handler
    return { ok: true, data: { id: question.id } };
  } catch (error) {
    console.error("[actions/question] deleteQuestion failed", error);
    return fail("INTERNAL", "Something went wrong. Please try again.");
  }
}

export async function reorderQuestions(
  input: ReorderQuestionsInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await getSession();
    if (!session) return fail("UNAUTHORIZED", "You must be signed in");

    const parsed = reorderQuestionsSchema.safeParse(input);
    if (!parsed.success)
      return fail(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid input",
      );

    const { quizId, questionIds } = parsed.data;

    console.info("[actions/question] reorderQuestions", {
      userId: session.user.id,
      quizId,
    });

    const quiz = await getOwnedQuiz(quizId, session.user.id);
    if (!quiz) return fail("NOT_FOUND", "Quiz not found");

    const existing = await db
      .select({ id: questions.id })
      .from(questions)
      .where(eq(questions.quizId, quiz.id));

    const existingIds = new Set(existing.map((r) => r.id));
    if (
      new Set(questionIds).size !== questionIds.length ||
      questionIds.length !== existingIds.size ||
      questionIds.some((id) => !existingIds.has(id))
    )
      return fail(
        "VALIDATION_ERROR",
        "questionIds must match the quiz's questions exactly",
      );

    // Atomic write: a partial update would leave inconsistent sort ordering.
    await db.transaction(async (tx) => {
      for (let i = 0; i < questionIds.length; i++) {
        await tx
          .update(questions)
          .set({ sortOrder: i })
          .where(eq(questions.id, questionIds[i]));
      }
    });

    revalidatePath("/dashboard");
    revalidatePath(`/quizzes/${quiz.id}/edit`);
    revalidatePath(`/q/${quiz.shareCode}`);
    revalidatePath(`/api/public/quiz/${quiz.shareCode}`); // invalidate cached route handler
    return { ok: true, data: { id: quiz.id } };
  } catch (error) {
    console.error("[actions/question] reorderQuestions failed", error);
    return fail("INTERNAL", "Something went wrong. Please try again.");
  }
}
