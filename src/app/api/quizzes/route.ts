import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUserQuizList } from "@/lib/quiz";
import { errorResponse } from "@/lib/api";

export async function GET() {
  try {
    const session = await getSession();
    if (!session)
      return errorResponse("UNAUTHORIZED", "You must be signed in", 401);

    console.info("[api/quizzes] GET", { userId: session.user.id });

    return NextResponse.json(await getUserQuizList(session.user.id));
  } catch (error) {
    console.error("[api/quizzes] GET failed", error);
    return errorResponse("INTERNAL", "Something went wrong", 500);
  }
}
