"use client";

import Link from "next/link";
import { useParams, redirect } from "next/navigation";
import { useQuizPlayerStore } from "@/stores/quiz-player-store";
import { ResultCard } from "@/components/quiz/result-card";

export default function QuizResultsPage() {
  const { shareCode } = useParams<{ shareCode: string }>();

  const quiz = useQuizPlayerStore((s) => s.quiz);
  const answers = useQuizPlayerStore((s) => s.answers);
  const score = useQuizPlayerStore((s) => s.score);
  const total = useQuizPlayerStore((s) => s.total);
  const results = useQuizPlayerStore((s) => s.results);

  // Results live only in memory (SPEC §6). A direct visit or hard refresh has
  // none → send the visitor to (re)take the quiz.
  if (results === null || quiz === null || score === null || total === null) {
    redirect(`/q/${shareCode}`);
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">
        You scored {score}/{total}
      </h1>
      <Link
        href={`/q/${shareCode}`}
        className="mt-2 inline-block underline underline-offset-2 hover:no-underline"
      >
        Retake quiz
      </Link>

      <ul className="mt-8 flex flex-col gap-4">
        {results.map((r, i) => (
          <ResultCard
            key={quiz.questions[i].id}
            index={i + 1}
            prompt={quiz.questions[i].prompt}
            options={quiz.questions[i].options}
            userAnswer={answers[i]}
            correctIndex={r.correctIndex}
            correct={r.correct}
            explanation={r.explanation}
          />
        ))}
      </ul>
    </main>
  );
}
