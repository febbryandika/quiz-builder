"use client";

import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { AttemptResponse } from "@/lib/quiz";

// POST the attempt to the public scoring route (SPEC §5.3). No cache
// invalidation: there's no cached public-attempt query to refresh.
export function useSubmitAttempt() {
  return useMutation({
    mutationFn: (variables: { shareCode: string; answersJson: string }) =>
      apiFetch<AttemptResponse>(
        `/api/public/quiz/${variables.shareCode}/attempt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answersJson: variables.answersJson }),
        },
      ),
  });
}
