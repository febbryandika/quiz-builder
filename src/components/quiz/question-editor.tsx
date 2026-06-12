"use client";

import { useState } from "react";
import { z } from "zod";
import { questionSchema } from "@/lib/validations";
import { useAddQuestion } from "@/hooks/use-question-mutations";
import { useUpdateQuestion } from "@/hooks/use-question-mutations";

type FieldErrors = Partial<
  Record<"prompt" | "options" | "correctIndex" | "explanation", string[]>
>;

type InitialQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
};

type AddProps = {
  quizId: string;
  initial?: undefined;
  onDone?: undefined;
};

type EditProps = {
  quizId: string;
  initial: InitialQuestion;
  onDone: () => void;
};

type Props = AddProps | EditProps;

export function QuestionEditor({ quizId, initial, onDone }: Props) {
  const addQuestion = useAddQuestion();
  const updateQuestion = useUpdateQuestion();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const isEdit = initial !== undefined;
  const isPending = isEdit ? updateQuestion.isPending : addQuestion.isPending;

  // Suffix ids in edit mode so an open inline editor never duplicates the
  // add form's DOM ids
  const fieldId = (name: string) => (initial ? `${name}-${initial.id}` : name);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    // Capture form ref BEFORE any await
    const form = event.currentTarget;
    const fd = new FormData(form);

    const options = [0, 1, 2, 3].map((i) =>
      String(fd.get(`option-${i}`) ?? ""),
    );
    const correctIndex = Number(fd.get("correctIndex"));

    const raw = {
      prompt: String(fd.get("prompt") ?? ""),
      options,
      correctIndex,
      explanation: String(fd.get("explanation") ?? "") || undefined,
    };

    const parsed = questionSchema.safeParse(raw);
    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }
    setFieldErrors({});

    if (isEdit) {
      updateQuestion.mutate(
        { questionId: initial.id, quizId, input: parsed.data },
        {
          onSuccess: () => {
            onDone();
          },
          onError: (err) => {
            setFormError(
              err instanceof Error ? err.message : "Failed to save question",
            );
          },
        },
      );
    } else {
      addQuestion.mutate(
        { quizId, input: parsed.data },
        {
          onSuccess: () => {
            form.reset();
          },
          onError: (err) => {
            setFormError(
              err instanceof Error ? err.message : "Failed to add question",
            );
          },
        },
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor={fieldId("prompt")} className="font-medium">
          Prompt
        </label>
        <textarea
          id={fieldId("prompt")}
          name="prompt"
          rows={3}
          required
          defaultValue={initial?.prompt ?? ""}
          className="rounded border px-3 py-2"
          aria-invalid={Boolean(fieldErrors.prompt)}
          aria-describedby={
            fieldErrors.prompt ? fieldId("prompt-error") : undefined
          }
        />
        {fieldErrors.prompt && (
          <p id={fieldId("prompt-error")} className="text-sm text-red-600">
            {fieldErrors.prompt[0]}
          </p>
        )}
      </div>

      <fieldset>
        <legend className="mb-2 font-medium">Options</legend>
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="correctIndex"
                value={i}
                defaultChecked={isEdit ? initial.correctIndex === i : i === 0}
              />
              <input
                type="text"
                name={`option-${i}`}
                aria-label={`Option ${i + 1}`}
                required
                defaultValue={initial?.options[i] ?? ""}
                className="flex-1 rounded border px-3 py-2"
              />
            </div>
          ))}
        </div>
        {fieldErrors.options && (
          <p className="mt-1 text-sm text-red-600">{fieldErrors.options[0]}</p>
        )}
      </fieldset>

      <div className="flex flex-col gap-1">
        <label htmlFor={fieldId("explanation")} className="font-medium">
          Explanation{" "}
          <span className="font-normal text-neutral-500">(optional)</span>
        </label>
        <textarea
          id={fieldId("explanation")}
          name="explanation"
          rows={2}
          defaultValue={initial?.explanation ?? ""}
          className="rounded border px-3 py-2"
          aria-invalid={Boolean(fieldErrors.explanation)}
          aria-describedby={
            fieldErrors.explanation ? fieldId("explanation-error") : undefined
          }
        />
        {fieldErrors.explanation && (
          <p id={fieldId("explanation-error")} className="text-sm text-red-600">
            {fieldErrors.explanation[0]}
          </p>
        )}
      </div>

      {formError && (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {isPending ? "Saving…" : isEdit ? "Save" : "Add question"}
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={onDone}
            className="rounded border px-4 py-2 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
