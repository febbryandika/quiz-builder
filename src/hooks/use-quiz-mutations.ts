"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createQuiz, updateQuiz, deleteQuiz } from "@/actions/quiz";
import type { QuizInput, UpdateQuizInput } from "@/lib/validations";
import { quizKeys } from "./use-quizzes";

export function useCreateQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: QuizInput) => {
      const res = await createQuiz(input);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quizKeys.list() });
    },
  });
}

export function useUpdateQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { id: string; input: UpdateQuizInput }) => {
      const res = await updateQuiz(variables.id, variables.input);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      // title/publish status affect both the list card and the detail — invalidate all
      void queryClient.invalidateQueries({ queryKey: quizKeys.all });
    },
  });
}

export function useDeleteQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteQuiz(id);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quizKeys.list() });
    },
  });
}
