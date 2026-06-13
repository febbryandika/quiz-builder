"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuiz } from "@/hooks/use-quiz";
import { ApiError } from "@/lib/api-client";
import { MAX_QUESTIONS_PER_QUIZ } from "@/lib/validations";
import { PublishBar } from "./publish-bar";
import { QuizForm } from "./quiz-form";
import { QuestionList } from "./question-list";
import { QuestionEditor } from "./question-editor";
import { DeleteQuizButton } from "./delete-quiz-button";

type Props = {
  quizId: string;
};

export function QuizEditor({ quizId }: Props) {
  const router = useRouter();
  const { data, error, isPending, refetch } = useQuiz(quizId);

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      router.push("/login");
    }
  }, [error, router]);

  if (isPending) {
    return (
      <div className="flex flex-col gap-6" aria-label="Loading quiz">
        <div className="h-8 w-1/2 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
        <div className="h-20 animate-pulse rounded border bg-neutral-100 dark:bg-neutral-800" />
        <div className="h-40 animate-pulse rounded border bg-neutral-100 dark:bg-neutral-800" />
        <div className="h-40 animate-pulse rounded border bg-neutral-100 dark:bg-neutral-800" />
      </div>
    );
  }

  if (error) {
    if (error instanceof ApiError && error.status === 401) {
      return <p className="text-sm text-neutral-500">Redirecting…</p>;
    }
    if (error instanceof ApiError && error.status === 404) {
      return (
        <div className="flex flex-col gap-3">
          <p className="font-medium">Quiz not found</p>
          <Link href="/dashboard" className="text-sm underline">
            Back to dashboard
          </Link>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-red-600" role="alert">
          {error instanceof Error ? error.message : "Failed to load quiz"}
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

  const atQuestionLimit = data.questions.length >= MAX_QUESTIONS_PER_QUIZ;

  return (
    <div className="flex flex-col gap-0">
      <h1 className="text-2xl font-bold">{data.title}</h1>

      <section className="mt-8 flex flex-col gap-4">
        <PublishBar
          quizId={quizId}
          isPublished={data.isPublished}
          shareCode={data.shareCode}
        />
      </section>

      <section className="mt-8 flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Details</h2>
        <QuizForm
          mode="edit"
          quizId={quizId}
          initial={{
            title: data.title,
            description: data.description,
            timeLimit: data.timeLimit,
            randomize: data.randomize,
          }}
        />
      </section>

      <section className="mt-8 flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Questions</h2>
        <QuestionList quizId={quizId} questions={data.questions} />
        {atQuestionLimit ? (
          <p className="text-sm text-neutral-500">
            Question limit reached ({MAX_QUESTIONS_PER_QUIZ}).
          </p>
        ) : (
          <div className="mt-4">
            <h3 className="mb-4 font-medium">Add question</h3>
            <QuestionEditor quizId={quizId} />
          </div>
        )}
      </section>

      <section className="mt-8 flex flex-col gap-4">
        <DeleteQuizButton quizId={quizId} />
      </section>
    </div>
  );
}
