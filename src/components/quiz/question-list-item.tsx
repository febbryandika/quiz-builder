"use client";

import { useState } from "react";
import { useDeleteQuestion } from "@/hooks/use-question-mutations";
import { QuestionEditor } from "./question-editor";

type Question = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
  sortOrder: number;
};

type Props = {
  quizId: string;
  question: Question;
  index: number;
  total: number;
  reorderPending: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

export function QuestionListItem({
  quizId,
  question,
  index,
  total,
  reorderPending,
  onMoveUp,
  onMoveDown,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteQuestion = useDeleteQuestion();

  function handleDelete() {
    deleteQuestion.mutate({ questionId: question.id, quizId });
  }

  if (editing) {
    return (
      <li className="rounded border p-4">
        <QuestionEditor
          quizId={quizId}
          initial={question}
          onDone={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-2 rounded border p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">
          {index + 1}. {question.prompt}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0 || reorderPending}
            aria-label={`Move up: ${question.prompt}`}
            className="rounded border px-2 py-1 text-sm disabled:opacity-40"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1 || reorderPending}
            aria-label={`Move down: ${question.prompt}`}
            className="rounded border px-2 py-1 text-sm disabled:opacity-40"
          >
            ↓
          </button>
        </div>
      </div>

      <ol className="flex flex-col gap-1 pl-4 text-sm">
        {question.options.map((opt, i) => (
          <li key={i} className="flex items-center gap-1">
            <span>{opt}</span>
            {i === question.correctIndex && (
              <span className="rounded bg-green-100 px-1 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-100">
                Correct
              </span>
            )}
          </li>
        ))}
      </ol>

      {question.explanation && (
        <p className="text-sm text-neutral-500">{question.explanation}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded border px-3 py-1 text-sm"
        >
          Edit
        </button>
        {confirmDelete ? (
          <span className="flex items-center gap-2 text-sm">
            <span>Delete this question?</span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteQuestion.isPending}
              className="rounded bg-red-600 px-3 py-1 text-white disabled:opacity-50"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded border px-3 py-1"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded border px-3 py-1 text-sm text-red-600"
          >
            Delete
          </button>
        )}
      </div>

      {deleteQuestion.isError && (
        <p role="alert" className="text-sm text-red-600">
          {deleteQuestion.error.message}
        </p>
      )}
    </li>
  );
}
