"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { quizzes } from "@/db/schema";
import { type ActionResult, fail } from "@/lib/action-result";
import { getSession } from "@/lib/session";
import {
  idSchema,
  quizSchema,
  updateQuizSchema,
  type QuizInput,
  type UpdateQuizInput,
} from "@/lib/validations";

export async function createQuiz(
  input: QuizInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await getSession();
    if (!session) return fail("UNAUTHORIZED", "You must be signed in");

    const parsed = quizSchema.safeParse(input);
    if (!parsed.success)
      return fail(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid input",
      );

    console.info("[actions/quiz] createQuiz", { userId: session.user.id });

    const [created] = await db
      .insert(quizzes)
      .values({ ...parsed.data, userId: session.user.id })
      .returning({ id: quizzes.id });

    revalidatePath("/dashboard");
    return { ok: true, data: { id: created.id } };
  } catch (error) {
    console.error("[actions/quiz] createQuiz failed", error);
    return fail("INTERNAL", "Something went wrong. Please try again.");
  }
}

export async function updateQuiz(
  id: string,
  input: UpdateQuizInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await getSession();
    if (!session) return fail("UNAUTHORIZED", "You must be signed in");

    const parsedId = idSchema.safeParse(id);
    if (!parsedId.success)
      return fail(
        "VALIDATION_ERROR",
        parsedId.error.issues[0]?.message ?? "Invalid input",
      );
    const parsed = updateQuizSchema.safeParse(input);
    if (!parsed.success)
      return fail(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid input",
      );

    console.info("[actions/quiz] updateQuiz", {
      userId: session.user.id,
      quizId: parsedId.data,
    });

    const quiz = await db.query.quizzes.findFirst({
      where: eq(quizzes.id, parsedId.data),
    });
    if (!quiz || quiz.userId !== session.user.id)
      return fail("NOT_FOUND", "Quiz not found");

    // Drizzle skips undefined keys in .set(); refine guarantees >= 1 defined key.
    await db.update(quizzes).set(parsed.data).where(eq(quizzes.id, quiz.id));

    revalidatePath("/dashboard");
    revalidatePath(`/quizzes/${quiz.id}/edit`);
    revalidatePath(`/q/${quiz.shareCode}`); // content/publish affects public page (SPEC §9)
    revalidatePath(`/api/public/quiz/${quiz.shareCode}`); // invalidate cached route handler
    return { ok: true, data: { id: quiz.id } };
  } catch (error) {
    console.error("[actions/quiz] updateQuiz failed", error);
    return fail("INTERNAL", "Something went wrong. Please try again.");
  }
}

export async function deleteQuiz(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await getSession();
    if (!session) return fail("UNAUTHORIZED", "You must be signed in");

    const parsedId = idSchema.safeParse(id);
    if (!parsedId.success)
      return fail(
        "VALIDATION_ERROR",
        parsedId.error.issues[0]?.message ?? "Invalid input",
      );

    console.info("[actions/quiz] deleteQuiz", {
      userId: session.user.id,
      quizId: parsedId.data,
    });

    const quiz = await db.query.quizzes.findFirst({
      where: eq(quizzes.id, parsedId.data),
    });
    if (!quiz || quiz.userId !== session.user.id)
      return fail("NOT_FOUND", "Quiz not found");

    await db.delete(quizzes).where(eq(quizzes.id, quiz.id));

    revalidatePath("/dashboard");
    revalidatePath(`/q/${quiz.shareCode}`);
    revalidatePath(`/api/public/quiz/${quiz.shareCode}`); // invalidate cached route handler
    return { ok: true, data: { id: quiz.id } };
  } catch (error) {
    console.error("[actions/quiz] deleteQuiz failed", error);
    return fail("INTERNAL", "Something went wrong. Please try again.");
  }
}
