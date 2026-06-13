"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiFetch } from "@/lib/api-client";
import type { QuizListItem } from "@/lib/quiz";

// Wire type: createdAt arrives as ISO string over JSON
export type QuizListItemWire = Omit<QuizListItem, "createdAt"> & {
  createdAt: string;
};

// Hierarchical query keys — prefix invalidation works with queryClient.invalidateQueries
export const quizKeys = {
  all: ["quizzes"] as const,
  list: () => ["quizzes", "list"] as const,
  detail: (id: string) => ["quizzes", id] as const,
  analytics: (id: string) => ["quizzes", id, "analytics"] as const,
};

// Don't retry deterministic client errors (401/404): retrying only delays
// the error UI (not-found screen, login redirect)
export function retryUnlessClientError(failureCount: number, error: Error) {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false;
  }
  return failureCount < 3;
}

export function useQuizzes() {
  return useQuery({
    queryKey: quizKeys.list(),
    queryFn: () => apiFetch<QuizListItemWire[]>("/api/quizzes"),
    retry: retryUnlessClientError,
  });
}
