"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { quizSchema } from "@/lib/validations";
import { coerceTimeLimit } from "@/lib/quiz-ui";
import { useCreateQuiz } from "@/hooks/use-quiz-mutations";
import { useUpdateQuiz } from "@/hooks/use-quiz-mutations";

type FieldErrors = Partial<
  Record<"title" | "description" | "timeLimit" | "randomize", string[]>
>;

type CreateProps = {
  mode: "create";
};

type EditProps = {
  mode: "edit";
  quizId: string;
  initial: {
    title: string;
    description: string | null;
    timeLimit: number | null;
    randomize: boolean;
  };
};

type Props = CreateProps | EditProps;

export function QuizForm(props: Props) {
  const router = useRouter();
  const createQuiz = useCreateQuiz();
  const updateQuiz = useUpdateQuiz();

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = props.mode === "create" ? createQuiz : updateQuiz;
  const isPending = mutation.isPending;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const fd = new FormData(event.currentTarget);

    const raw = {
      title: String(fd.get("title") ?? ""),
      description: String(fd.get("description") ?? ""),
      timeLimit: coerceTimeLimit(String(fd.get("timeLimit") ?? "")),
      randomize: fd.get("randomize") === "on",
    };

    // Coerce description: empty/whitespace → undefined
    const input = {
      ...raw,
      description: raw.description.trim() === "" ? undefined : raw.description,
    };

    const parsed = quizSchema.safeParse(input);
    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }
    setFieldErrors({});

    if (props.mode === "create") {
      createQuiz.mutate(parsed.data, {
        onSuccess: (data) => {
          router.push(`/quizzes/${data.id}/edit`);
        },
        onError: (err) => {
          setFormError(
            err instanceof Error ? err.message : "Failed to create quiz",
          );
        },
      });
    } else {
      updateQuiz.mutate(
        { id: props.quizId, input: parsed.data },
        {
          onError: (err) => {
            setFormError(
              err instanceof Error ? err.message : "Failed to save quiz",
            );
          },
        },
      );
    }
  }

  const initial = props.mode === "edit" ? props.initial : undefined;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="font-medium">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={initial?.title ?? ""}
          className="rounded border px-3 py-2"
          aria-invalid={Boolean(fieldErrors.title)}
          aria-describedby={fieldErrors.title ? "title-error" : undefined}
        />
        {fieldErrors.title && (
          <p id="title-error" className="text-sm text-red-600">
            {fieldErrors.title[0]}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ""}
          className="rounded border px-3 py-2"
          aria-invalid={Boolean(fieldErrors.description)}
          aria-describedby={
            fieldErrors.description ? "description-error" : undefined
          }
        />
        {fieldErrors.description && (
          <p id="description-error" className="text-sm text-red-600">
            {fieldErrors.description[0]}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="timeLimit" className="font-medium">
          Time limit (seconds)
        </label>
        <input
          id="timeLimit"
          name="timeLimit"
          type="number"
          min={1}
          step={1}
          defaultValue={initial?.timeLimit ?? ""}
          className="rounded border px-3 py-2"
          aria-invalid={Boolean(fieldErrors.timeLimit)}
          aria-describedby={
            fieldErrors.timeLimit ? "timeLimit-error" : "timeLimit-hint"
          }
        />
        <p id="timeLimit-hint" className="text-sm text-neutral-500">
          Leave blank for no time limit
        </p>
        {fieldErrors.timeLimit && (
          <p id="timeLimit-error" className="text-sm text-red-600">
            {fieldErrors.timeLimit[0]}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          id="randomize"
          name="randomize"
          type="checkbox"
          defaultChecked={initial?.randomize ?? false}
        />
        <label htmlFor="randomize" className="font-medium">
          Randomize question order
        </label>
      </div>

      {formError && (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {isPending
          ? "Saving…"
          : props.mode === "create"
            ? "Create quiz"
            : "Save"}
      </button>
    </form>
  );
}
