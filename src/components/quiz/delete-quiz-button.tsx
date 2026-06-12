"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDeleteQuiz } from "@/hooks/use-quiz-mutations";

type Props = {
  quizId: string;
};

export function DeleteQuizButton({ quizId }: Props) {
  const router = useRouter();
  const deleteQuiz = useDeleteQuiz();
  const [confirm, setConfirm] = useState(false);

  function handleDelete() {
    deleteQuiz.mutate(quizId, {
      onSuccess: () => {
        router.push("/dashboard");
      },
    });
  }

  if (!confirm) {
    return (
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="text-sm text-red-600"
      >
        Delete quiz
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-2 text-sm">
        <span>Delete this quiz?</span>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleteQuiz.isPending}
          className="rounded bg-red-600 px-3 py-1 text-white disabled:opacity-50"
        >
          Delete
        </button>
        <button
          type="button"
          onClick={() => setConfirm(false)}
          className="rounded border px-3 py-1"
        >
          Cancel
        </button>
      </span>
      {deleteQuiz.isError && (
        <p role="alert" className="text-sm text-red-600">
          {deleteQuiz.error.message}
        </p>
      )}
    </div>
  );
}
