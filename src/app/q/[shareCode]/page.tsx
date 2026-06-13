import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedQuiz, toPublicQuiz } from "@/lib/quiz";
import { QuizPlayer } from "@/components/quiz/quiz-player";

// Link previews (SPEC §3.2): title/description from the published quiz.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ shareCode: string }>;
}): Promise<Metadata> {
  const { shareCode } = await params;
  const quiz = await getPublishedQuiz(shareCode);
  if (!quiz) return { title: "Quiz not found" };
  return {
    title: quiz.title,
    description: quiz.description ?? "Take this quiz",
  };
}

export default async function TakeQuizPage({
  params,
}: {
  params: Promise<{ shareCode: string }>;
}) {
  const { shareCode } = await params;

  // getPublishedQuiz returns full detail (with answers); only the sanitized
  // PublicQuiz crosses into the client tree (SPEC §7).
  const quiz = await getPublishedQuiz(shareCode);
  if (!quiz) notFound();

  return (
    <main className="mx-auto max-w-2xl p-8">
      <QuizPlayer quiz={toPublicQuiz(quiz)} />
    </main>
  );
}
