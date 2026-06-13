"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { PublicQuiz } from "@/lib/quiz";
import { useQuizPlayerStore } from "@/stores/quiz-player-store";
import { useSubmitAttempt } from "@/hooks/use-submit-attempt";
import { formatTimer } from "@/lib/quiz-ui";

export function QuizPlayer({ quiz }: { quiz: PublicQuiz }) {
  const router = useRouter();
  const { mutate: submitMutate, isError: submitFailed } = useSubmitAttempt();

  const initialized = useQuizPlayerStore((s) => s.quizId === quiz.id);
  const order = useQuizPlayerStore((s) => s.order);
  const answers = useQuizPlayerStore((s) => s.answers);
  const current = useQuizPlayerStore((s) => s.current);
  const remaining = useQuizPlayerStore((s) => s.remaining);
  const status = useQuizPlayerStore((s) => s.status);
  const select = useQuizPlayerStore((s) => s.select);
  const next = useQuizPlayerStore((s) => s.next);
  const back = useQuizPlayerStore((s) => s.back);

  // (Re)initialize on mount and whenever the quiz changes (incl. retake).
  useEffect(() => {
    useQuizPlayerStore.getState().init(quiz);
  }, [quiz]);

  // Reads live state via getState() so the callback stays referentially stable.
  const submit = useCallback(() => {
    const store = useQuizPlayerStore.getState();
    if (store.status !== "idle") return;
    store.setStatus("submitting");
    submitMutate(
      { shareCode: quiz.shareCode, answersJson: store.buildAnswersJson() },
      {
        onSuccess: (resp) => {
          useQuizPlayerStore.getState().setResults(resp);
          router.push(`/q/${quiz.shareCode}/done`);
        },
        onError: () => {
          useQuizPlayerStore.getState().setStatus("idle");
        },
      },
    );
  }, [quiz.shareCode, router, submitMutate]);

  // Countdown timer (total quiz, only when a time limit is set).
  useEffect(() => {
    if (quiz.timeLimit === null || status !== "idle") return;
    const id = setInterval(() => useQuizPlayerStore.getState().tick(), 1000);
    return () => clearInterval(id);
  }, [quiz.timeLimit, status]);

  // Auto-submit when the timer reaches zero.
  useEffect(() => {
    if (remaining === 0 && status === "idle") submit();
  }, [remaining, status, submit]);

  if (!initialized) {
    return (
      <div
        className="h-40 animate-pulse rounded border bg-neutral-100 dark:bg-neutral-800"
        aria-label="Loading quiz"
      />
    );
  }

  const total = quiz.questions.length;
  if (total === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold">{quiz.title}</h1>
        <p className="mt-2 text-neutral-500">This quiz has no questions yet.</p>
      </div>
    );
  }

  const originalIndex = order[current];
  const question = quiz.questions[originalIndex];
  const selected = answers[originalIndex];
  const isLast = current === total - 1;
  const progress = ((current + 1) / total) * 100;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">{quiz.title}</h1>
          {remaining !== null && (
            <span
              className="font-mono text-sm tabular-nums"
              aria-label="Time remaining"
            >
              {formatTimer(remaining)}
            </span>
          )}
        </div>
        <div
          role="progressbar"
          aria-valuenow={current + 1}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label={`Question ${current + 1} of ${total}`}
          className="h-2 w-full overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800"
        >
          <div
            className="h-full bg-black dark:bg-white"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-neutral-500">
          Question {current + 1} of {total}
        </p>
      </header>

      <fieldset>
        <legend className="mb-3 text-lg font-semibold">
          {question.prompt}
        </legend>
        <div className="flex flex-col gap-2">
          {question.options.map((option, i) => (
            <label
              key={i}
              className="flex items-center gap-3 rounded border px-3 py-2"
            >
              <input
                type="radio"
                name={`q-${question.id}`}
                checked={selected === i}
                onChange={() => select(originalIndex, i)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {submitFailed && (
        <p role="alert" className="text-sm text-red-600">
          Couldn’t submit your answers. Please try again.
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={back}
          disabled={current === 0}
          className="rounded border px-4 py-2 disabled:opacity-50"
        >
          Back
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={submit}
            disabled={status !== "idle"}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {status === "idle" ? "Submit" : "Submitting…"}
          </button>
        ) : (
          <button
            type="button"
            onClick={next}
            className="rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
