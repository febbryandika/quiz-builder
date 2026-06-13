"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { QuizAnalytics } from "@/lib/quiz";
import { quizKeys, retryUnlessClientError } from "./use-quizzes";

// No Date fields in QuizAnalytics → no Wire type needed.
export function useQuizAnalytics(id: string, enabled: boolean) {
  return useQuery({
    queryKey: quizKeys.analytics(id),
    queryFn: () => apiFetch<QuizAnalytics>(`/api/quizzes/${id}/analytics`),
    retry: retryUnlessClientError,
    enabled, // only fetch once the panel is opened
  });
}
