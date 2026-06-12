import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getQuizForEditor } from "@/lib/quiz";
import { errorResponse } from "@/lib/api";
import { idSchema } from "@/lib/validations";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session)
      return errorResponse("UNAUTHORIZED", "You must be signed in", 401);

    const { id } = await params;
    const parsedId = idSchema.safeParse(id);
    if (!parsedId.success)
      return errorResponse(
        "VALIDATION_ERROR",
        parsedId.error.issues[0]?.message ?? "Invalid input",
        400,
      );

    console.info("[api/quizzes/[id]] GET", { userId: session.user.id, id });

    const quiz = await getQuizForEditor(parsedId.data, session.user.id);
    if (!quiz) return errorResponse("NOT_FOUND", "Quiz not found", 404);

    return NextResponse.json(quiz);
  } catch (error) {
    console.error("[api/quizzes/[id]] GET failed", error);
    return errorResponse("INTERNAL", "Something went wrong", 500);
  }
}
