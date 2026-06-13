import { create } from "zustand";
import type { AttemptResponse, PublicQuiz } from "@/lib/quiz";
import { UNANSWERED } from "@/lib/validations";

type Status = "idle" | "submitting" | "submitted" | "failed";

type QuizPlayerState = {
  quizId: string | null;
  // The quiz being played; retained so the results page (/done) can render each
  // question's prompt/options alongside the scored result.
  quiz: PublicQuiz | null;
  // Display position → original question index. Identity when randomize is off;
  // a shuffle when on. Display question = quiz.questions[order[current]].
  order: number[];
  // Answers indexed by ORIGINAL question position; UNANSWERED (-1) = skipped.
  // Already in submit order, so no remap is needed when randomize is on.
  answers: number[];
  current: number; // display position into `order`
  remaining: number | null; // seconds left; null when the quiz has no timeLimit
  status: Status;
  // Scored result, populated after a successful submit (read by /done).
  score: number | null;
  total: number | null;
  results: AttemptResponse["results"] | null;

  init: (quiz: PublicQuiz) => void;
  select: (originalIndex: number, choice: number) => void;
  next: () => void;
  back: () => void;
  tick: () => void;
  setStatus: (status: Status) => void;
  setResults: (resp: AttemptResponse) => void;
  buildAnswersJson: () => string;
};

// Fisher–Yates shuffle of [0..n-1]
function shuffledOrder(n: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export const useQuizPlayerStore = create<QuizPlayerState>((set, get) => ({
  quizId: null,
  quiz: null,
  order: [],
  answers: [],
  current: 0,
  remaining: null,
  status: "idle",
  score: null,
  total: null,
  results: null,

  // Full reset for a fresh attempt. Called from a mount effect keyed on the
  // quiz, so it also clears prior answers/results on retake.
  init: (quiz) => {
    const n = quiz.questions.length;
    set({
      quizId: quiz.id,
      quiz,
      order: quiz.randomize
        ? shuffledOrder(n)
        : Array.from({ length: n }, (_, i) => i),
      answers: Array.from({ length: n }, () => UNANSWERED),
      current: 0,
      remaining: quiz.timeLimit,
      status: "idle",
      score: null,
      total: null,
      results: null,
    });
  },

  select: (originalIndex, choice) => {
    const answers = [...get().answers];
    answers[originalIndex] = choice;
    set({ answers });
  },

  next: () => {
    const { current, order } = get();
    set({ current: Math.min(current + 1, order.length - 1) });
  },

  back: () => {
    set({ current: Math.max(get().current - 1, 0) });
  },

  tick: () => {
    const { remaining } = get();
    if (remaining === null) return;
    set({ remaining: Math.max(0, remaining - 1) });
  },

  setStatus: (status) => set({ status }),

  setResults: (resp) =>
    set({
      score: resp.score,
      total: resp.total,
      results: resp.results,
      status: "submitted",
    }),

  buildAnswersJson: () => JSON.stringify(get().answers),
}));
