"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { QuizDetail } from "@/lib/quiz";
import { quizKeys, retryUnlessClientError } from "./use-quizzes";

// Wire type: createdAt arrives as ISO string over JSON
export type QuizDetailWire = Omit<QuizDetail, "createdAt"> & {
  createdAt: string;
};

export function useQuiz(id: string) {
  return useQuery({
    queryKey: quizKeys.detail(id),
    queryFn: () => apiFetch<QuizDetailWire>(`/api/quizzes/${id}`),
    retry: retryUnlessClientError,
  });
}
