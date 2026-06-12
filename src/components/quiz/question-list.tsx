"use client";

import { useReorderQuestions } from "@/hooks/use-question-mutations";
import { QuestionListItem } from "./question-list-item";

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
  questions: Question[];
};

function move(ids: string[], from: number, to: number): string[] {
  const result = [...ids];
  const [removed] = result.splice(from, 1);
  result.splice(to, 0, removed);
  return result;
}

export function QuestionList({ quizId, questions }: Props) {
  const reorder = useReorderQuestions();

  function handleMove(from: number, to: number) {
    const ids = questions.map((q) => q.id);
    const questionIds = move(ids, from, to);
    reorder.mutate({ quizId, questionIds });
  }

  if (questions.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        No questions yet. Add your first question below.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {reorder.isError && (
        <p role="alert" className="text-sm text-red-600">
          {reorder.error.message}
        </p>
      )}
      <ul className="flex flex-col gap-4">
        {questions.map((question, index) => (
          <QuestionListItem
            key={question.id}
            quizId={quizId}
            question={question}
            index={index}
            total={questions.length}
            reorderPending={reorder.isPending}
            onMoveUp={() => handleMove(index, index - 1)}
            onMoveDown={() => handleMove(index, index + 1)}
          />
        ))}
      </ul>
    </div>
  );
}
