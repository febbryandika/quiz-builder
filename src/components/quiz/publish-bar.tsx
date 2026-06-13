"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { useUpdateQuiz } from "@/hooks/use-quiz-mutations";

type Props = {
  quizId: string;
  isPublished: boolean;
  shareCode: string;
};

const emptySubscribe = () => () => {};

// Hydration-safe window.location.origin: "" on the server, real origin on
// the client without a mismatch
function useOrigin() {
  return useSyncExternalStore(
    emptySubscribe,
    () => window.location.origin,
    () => "",
  );
}

export function PublishBar({ quizId, isPublished, shareCode }: Props) {
  const updateQuiz = useUpdateQuiz();
  const [copied, setCopied] = useState(false);
  const origin = useOrigin();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function handleTogglePublish() {
    updateQuiz.mutate({ id: quizId, input: { isPublished: !isPublished } });
  }

  function handleCopyLink() {
    const url = `${window.location.origin}/q/${shareCode}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded border p-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleTogglePublish}
          disabled={updateQuiz.isPending}
          className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {updateQuiz.isPending
            ? "Saving…"
            : isPublished
              ? "Unpublish"
              : "Publish"}
        </button>
        {isPublished && (
          <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-100">
            Published
          </span>
        )}
      </div>
      {updateQuiz.isError && (
        <p role="alert" className="text-sm text-red-600">
          {updateQuiz.error.message}
        </p>
      )}
      {isPublished && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={`${origin}/q/${shareCode}`}
            className="flex-1 rounded border px-3 py-2 text-sm"
            aria-label="Share link"
          />
          <button
            type="button"
            onClick={handleCopyLink}
            className="rounded border px-3 py-2 text-sm"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  );
}
