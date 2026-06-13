"use client";

import Link from "next/link";
import { useState } from "react";
import { formatPercent } from "@/lib/quiz-ui";
import { useQuizAnalytics } from "@/hooks/use-quiz-analytics";
import type { QuizListItemWire } from "@/hooks/use-quizzes";

type Props = {
  quiz: QuizListItemWire;
};

export function QuizCard({ quiz }: Props) {
  // Lazy-load analytics: only fetch once the disclosure is opened.
  const [open, setOpen] = useState(false);
  const { data, error, refetch } = useQuizAnalytics(quiz.id, open);

  const topMissed =
    data?.mostMissedQuestions.filter((q) => q.missCount > 0).slice(0, 5) ?? [];

  return (
    <li className="flex flex-col gap-2 rounded border p-4">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/quizzes/${quiz.id}/edit`}
          className="font-medium underline-offset-2 hover:underline"
        >
          {quiz.title}
        </Link>
        {quiz.isPublished ? (
          <span className="shrink-0 rounded bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-100">
            Published
          </span>
        ) : (
          <span className="shrink-0 rounded border px-2 py-0.5 text-xs text-neutral-500">
            Draft
          </span>
        )}
      </div>
      <p className="text-sm text-neutral-500">
        Attempts {quiz.attemptCount} · Avg score{" "}
        {formatPercent(quiz.averageScore)} · Completion{" "}
        {formatPercent(quiz.completionRate)}
      </p>

      {quiz.attemptCount > 0 && (
        <details className="mt-1" onToggle={(e) => setOpen(e.currentTarget.open)}>
          <summary className="cursor-pointer text-sm text-neutral-500">
            Most-missed questions
          </summary>
          <div className="mt-2">
            {error ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-red-600" role="alert">
                  {error instanceof Error
                    ? error.message
                    : "Failed to load analytics"}
                </p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="self-start rounded border px-3 py-1.5 text-sm"
                >
                  Retry
                </button>
              </div>
            ) : !data ? (
              <div
                className="h-12 animate-pulse rounded border bg-neutral-100 dark:bg-neutral-800"
                aria-hidden="true"
              />
            ) : topMissed.length === 0 ? (
              <p className="text-sm text-neutral-500">
                No misses yet — every question answered correctly.
              </p>
            ) : (
              <ol className="flex flex-col gap-1">
                {topMissed.map((q) => (
                  <li
                    key={q.questionId}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span className="text-neutral-700 dark:text-neutral-300">
                      {q.prompt}
                    </span>
                    <span className="shrink-0 text-neutral-500">
                      {formatPercent(q.missRate)} ({q.missCount}/
                      {quiz.attemptCount})
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </details>
      )}
    </li>
  );
}
