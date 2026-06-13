"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
} from "@/actions/question";
import type {
  QuestionInput,
  UpdateQuestionInput,
  ReorderQuestionsInput,
} from "@/lib/validations";
import { quizKeys } from "./use-quizzes";

export function useAddQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { quizId: string; input: QuestionInput }) => {
      const res = await addQuestion(variables.quizId, variables.input);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: quizKeys.detail(variables.quizId),
      });
    },
  });
}

export function useUpdateQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: {
      questionId: string;
      quizId: string;
      input: UpdateQuestionInput;
    }) => {
      const res = await updateQuestion(variables.questionId, variables.input);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: quizKeys.detail(variables.quizId),
      });
    },
  });
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { questionId: string; quizId: string }) => {
      const res = await deleteQuestion(variables.questionId);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: quizKeys.detail(variables.quizId),
      });
    },
  });
}

export function useReorderQuestions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: ReorderQuestionsInput) => {
      const res = await reorderQuestions(variables);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: quizKeys.detail(variables.quizId),
      });
    },
  });
}
