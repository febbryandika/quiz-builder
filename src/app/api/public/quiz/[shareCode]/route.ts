import { NextResponse } from "next/server";
import { getPublishedQuiz, toPublicQuiz } from "@/lib/quiz";
import { errorResponse } from "@/lib/api";

// Public quiz endpoint: no auth, statically cached for 5 minutes (SPEC §9)
export const dynamic = "force-static";
export const revalidate = 300;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shareCode: string }> },
) {
  try {
    const { shareCode } = await params;

    console.info("[api/public/quiz/[shareCode]] GET", { shareCode });

    const quiz = await getPublishedQuiz(shareCode);
    if (!quiz) return errorResponse("NOT_FOUND", "Quiz not found", 404);

    return NextResponse.json(toPublicQuiz(quiz));
  } catch (error) {
    console.error("[api/public/quiz/[shareCode]] GET failed", error);
    return errorResponse("INTERNAL", "Something went wrong", 500);
  }
}
