import Link from "next/link";
import { formatPercent } from "@/lib/quiz-ui";
import type { QuizListItemWire } from "@/hooks/use-quizzes";

type Props = {
  quiz: QuizListItemWire;
};

export function QuizCard({ quiz }: Props) {
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
    </li>
  );
}
