import { NextResponse } from "next/server";
import { db } from "@/db";
import { attempts } from "@/db/schema";
import { getPublishedQuiz } from "@/lib/quiz";
import type { AttemptResponse } from "@/lib/quiz";
import { errorResponse } from "@/lib/api";
import { attemptBodySchema, answersSchema } from "@/lib/validations";

// POST writes an attempt to the DB and scores it — must never be cached
// (contrast the GET sibling's force-static). SPEC §5.3.
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ shareCode: string }> },
) {
  try {
    const { shareCode } = await params;

    console.info("[api/public/quiz/[shareCode]/attempt] POST", { shareCode });

    const body: unknown = await req.json().catch(() => undefined);
    const parsed = attemptBodySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("INVALID_BODY", "answersJson required", 400);
    }

    // 404 before validating answers so we never leak shape info for a quiz
    // that doesn't exist (or isn't published).
    const quiz = await getPublishedQuiz(shareCode);
    if (!quiz) return errorResponse("NOT_FOUND", "Quiz not found", 404);

    let answers: unknown;
    try {
      answers = JSON.parse(parsed.data.answersJson);
    } catch {
      return errorResponse(
        "INVALID_BODY",
        "answersJson must be a JSON array",
        400,
      );
    }

    // Length must match question count; indexes must be -1 (unanswered) or 0–3.
    const answersParsed = answersSchema
      .length(quiz.questions.length)
      .safeParse(answers);
    if (!answersParsed.success) {
      return errorResponse("INVALID_ANSWERS", "Invalid answers", 400);
    }
    const selected = answersParsed.data;

    // Score positionally — quiz.questions is ordered by sortOrder asc, matching
    // the order the client submits answers in.
    let score = 0;
    const results = quiz.questions.map((q, i) => {
      const correct = selected[i] === q.correctIndex;
      if (correct) score++;
      return {
        correct,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
      };
    });

    await db.insert(attempts).values({
      quizId: quiz.id,
      answersJson: parsed.data.answersJson,
      score,
      total: quiz.questions.length,
      submittedAt: new Date(),
    });

    const response: AttemptResponse = {
      score,
      total: quiz.questions.length,
      results,
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error("[api/public/quiz/[shareCode]/attempt] POST failed", error);
    return errorResponse("INTERNAL", "Something went wrong", 500);
  }
}
