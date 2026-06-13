import { describe, it, expect, beforeEach } from "vitest";
import type { PublicQuiz } from "@/lib/quiz";
import { UNANSWERED } from "@/lib/validations";
import { useQuizPlayerStore } from "./quiz-player-store";

function makeQuiz(
  randomize: boolean,
  n = 4,
  timeLimit: number | null = null,
): PublicQuiz {
  return {
    id: "quiz-1",
    title: "T",
    description: null,
    timeLimit,
    randomize,
    shareCode: "abc123XYZ0",
    questions: Array.from({ length: n }, (_, i) => ({
      id: `q-${i}`,
      prompt: `p${i}`,
      options: ["a", "b", "c", "d"],
    })),
  };
}

const store = useQuizPlayerStore.getState;

beforeEach(() => {
  useQuizPlayerStore.setState({
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
  });
});

describe("init", () => {
  it("fills answers with UNANSWERED and sets remaining from timeLimit", () => {
    store().init(makeQuiz(false, 4, 120));
    const s = store();
    expect(s.answers).toEqual([
      UNANSWERED,
      UNANSWERED,
      UNANSWERED,
      UNANSWERED,
    ]);
    expect(s.remaining).toBe(120);
    expect(s.status).toBe("idle");
    expect(s.quizId).toBe("quiz-1");
  });

  it("order is identity when randomize is off", () => {
    store().init(makeQuiz(false, 4));
    expect(store().order).toEqual([0, 1, 2, 3]);
  });

  it("order is a permutation of all indices when randomize is on", () => {
    store().init(makeQuiz(true, 5));
    expect([...store().order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
  });

  it("resets prior answers on re-init (retake clears state)", () => {
    store().init(makeQuiz(false, 4));
    store().select(1, 2);
    expect(store().answers[1]).toBe(2);
    store().init(makeQuiz(false, 4));
    expect(store().answers).toEqual([
      UNANSWERED,
      UNANSWERED,
      UNANSWERED,
      UNANSWERED,
    ]);
  });
});

describe("select + buildAnswersJson", () => {
  it("writes by original index and serializes in original order regardless of display shuffle", () => {
    store().init(makeQuiz(true, 4));
    store().select(2, 3);
    store().select(0, 1);
    expect(JSON.parse(store().buildAnswersJson())).toEqual([
      1,
      UNANSWERED,
      3,
      UNANSWERED,
    ]);
  });
});

describe("next / back", () => {
  it("clamps within bounds", () => {
    store().init(makeQuiz(false, 3));
    store().back();
    expect(store().current).toBe(0);
    store().next();
    store().next();
    store().next();
    expect(store().current).toBe(2);
  });
});

describe("tick", () => {
  it("decrements remaining and floors at 0; no-op when null", () => {
    store().init(makeQuiz(false, 2, 2));
    store().tick();
    expect(store().remaining).toBe(1);
    store().tick();
    store().tick();
    expect(store().remaining).toBe(0);

    store().init(makeQuiz(false, 2, null));
    store().tick();
    expect(store().remaining).toBeNull();
  });
});

describe("setResults", () => {
  it("stores score/total/results and marks submitted", () => {
    store().init(makeQuiz(false, 2));
    store().setResults({
      score: 1,
      total: 2,
      results: [
        { correct: true, correctIndex: 0, explanation: null },
        { correct: false, correctIndex: 1, explanation: "e" },
      ],
    });
    const s = store();
    expect(s.score).toBe(1);
    expect(s.total).toBe(2);
    expect(s.status).toBe("submitted");
  });
});

describe("setStatus failed", () => {
  it("marks a failed submission and init clears it back to idle (retry/retake)", () => {
    store().init(makeQuiz(false, 2));
    store().setStatus("failed");
    expect(store().status).toBe("failed");
    store().init(makeQuiz(false, 2));
    expect(store().status).toBe("idle");
  });
});
