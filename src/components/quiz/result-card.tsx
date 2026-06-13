"use client";

import { UNANSWERED } from "@/lib/validations";

export function ResultCard({
  index,
  prompt,
  options,
  userAnswer,
  correctIndex,
  correct,
  explanation,
}: {
  index: number;
  prompt: string;
  options: string[];
  userAnswer: number;
  correctIndex: number;
  correct: boolean;
  explanation: string | null;
}) {
  return (
    <li className="flex flex-col gap-2 rounded border p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-medium">
          {index}. {prompt}
        </h2>
        <span
          className={
            correct
              ? "shrink-0 rounded bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-100"
              : "shrink-0 rounded bg-red-100 px-2 py-0.5 text-xs text-red-800 dark:bg-red-900 dark:text-red-100"
          }
        >
          {correct ? "Correct" : "Incorrect"}
        </span>
      </div>

      <ul className="flex flex-col gap-1">
        {options.map((option, i) => {
          const isCorrect = i === correctIndex;
          const isChosen = i === userAnswer;
          return (
            <li
              key={i}
              className={`rounded px-2 py-1 text-sm ${
                isCorrect
                  ? "bg-green-50 dark:bg-green-950"
                  : isChosen
                    ? "bg-red-50 dark:bg-red-950"
                    : ""
              }`}
            >
              <span>{option}</span>
              {isCorrect && (
                <span className="ml-2 text-xs text-green-700 dark:text-green-300">
                  Correct answer
                </span>
              )}
              {isChosen && !isCorrect && (
                <span className="ml-2 text-xs text-red-700 dark:text-red-300">
                  Your answer
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {userAnswer === UNANSWERED && (
        <p className="text-sm text-neutral-500">Not answered</p>
      )}

      {explanation && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {explanation}
        </p>
      )}
    </li>
  );
}
