"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuizzes } from "@/hooks/use-quizzes";
import { ApiError } from "@/lib/api-client";
import { QuizCard } from "./quiz-card";

export function QuizList() {
  const router = useRouter();
  const { data, error, isPending, refetch } = useQuizzes();

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      router.push("/login");
    }
  }, [error, router]);

  if (isPending) {
    return (
      <ul className="flex flex-col gap-4" aria-label="Loading quizzes">
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className="h-20 animate-pulse rounded border bg-neutral-100 dark:bg-neutral-800"
            aria-hidden="true"
          />
        ))}
      </ul>
    );
  }

  if (error) {
    if (error instanceof ApiError && error.status === 401) {
      return <p className="text-sm text-neutral-500">Redirecting…</p>;
    }
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-red-600" role="alert">
          {error instanceof Error ? error.message : "Failed to load quizzes"}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="self-start rounded border px-3 py-1.5 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <h2 className="text-lg font-semibold">No quizzes yet</h2>
        <p className="text-sm text-neutral-500">
          Create your first quiz to get started.
        </p>
        <Link
          href="/quizzes/new"
          className="rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
        >
          Create quiz
        </Link>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {data.map((quiz) => (
        <QuizCard key={quiz.id} quiz={quiz} />
      ))}
    </ul>
  );
}
