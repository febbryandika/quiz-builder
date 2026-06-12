import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  toPublicQuiz,
  toQuizListItem,
  getUserQuizList,
  getQuizForEditor,
  getPublishedQuiz,
  type QuizDetail,
} from "@/lib/quiz";

// Module-top-level console spies — silence logs while staying assertable
vi.spyOn(console, "info").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

const mocks = vi.hoisted(() => ({
  findFirstQuiz: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    query: { quizzes: { findFirst: mocks.findFirstQuiz } },
    select: mocks.select,
  },
}));

// ---------------------------------------------------------------------------
// toQuizListItem (pure mapper)
// ---------------------------------------------------------------------------
describe("toQuizListItem", () => {
  const BASE_ROW = {
    id: "quiz-1",
    title: "My Quiz",
    description: "desc",
    timeLimit: 300,
    randomize: false,
    isPublished: false,
    shareCode: "abc123XYZ0",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    attemptCount: 0,
    avgScoreRatio: null,
    completedCount: 0,
  };

  it("zero attempts → attemptCount 0, averageScore null, completionRate null", () => {
    const item = toQuizListItem({
      ...BASE_ROW,
      attemptCount: 0,
      avgScoreRatio: null,
      completedCount: 0,
    });
    expect(item.attemptCount).toBe(0);
    expect(item.averageScore).toBeNull();
    expect(item.completionRate).toBeNull();
  });

  it("attempts but none submitted → completionRate 0, not null", () => {
    const item = toQuizListItem({
      ...BASE_ROW,
      attemptCount: 5,
      avgScoreRatio: null,
      completedCount: 0,
    });
    expect(item.completionRate).toBe(0);
    expect(item.averageScore).toBeNull();
  });

  it("partial completion 3/10 → completionRate 0.3", () => {
    const item = toQuizListItem({
      ...BASE_ROW,
      attemptCount: 10,
      avgScoreRatio: null,
      completedCount: 3,
    });
    expect(item.completionRate).toBeCloseTo(0.3);
  });

  it("avgScoreRatio '0.75' (string from avg()) → averageScore 0.75", () => {
    const item = toQuizListItem({
      ...BASE_ROW,
      attemptCount: 4,
      avgScoreRatio: "0.75",
      completedCount: 4,
    });
    expect(item.averageScore).toBe(0.75);
  });

  it("passes through display fields unchanged", () => {
    const item = toQuizListItem(BASE_ROW);
    expect(item.id).toBe("quiz-1");
    expect(item.title).toBe("My Quiz");
    expect(item.shareCode).toBe("abc123XYZ0");
    expect(item.createdAt).toEqual(new Date("2024-01-01T00:00:00Z"));
  });
});

// ---------------------------------------------------------------------------
// toPublicQuiz (security mapper)
// ---------------------------------------------------------------------------
describe("toPublicQuiz", () => {
  const FULL_QUIZ: QuizDetail = {
    id: "quiz-1",
    title: "My Quiz",
    description: "desc",
    timeLimit: 300,
    randomize: false,
    isPublished: true,
    shareCode: "abc123XYZ0",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    questions: [
      {
        id: "q-1",
        prompt: "What is 2+2?",
        options: ["1", "2", "3", "4"],
        correctIndex: 3,
        explanation: "Basic addition",
        sortOrder: 0,
      },
      {
        id: "q-2",
        prompt: "What is 3+3?",
        options: ["5", "6", "7", "8"],
        correctIndex: 1,
        explanation: "More addition",
        sortOrder: 1,
      },
    ],
  };

  it("strips correctIndex from questions", () => {
    const pub = toPublicQuiz(FULL_QUIZ);
    expect(pub.questions[0]).not.toHaveProperty("correctIndex");
    expect(pub.questions[1]).not.toHaveProperty("correctIndex");
  });

  it("strips explanation from questions", () => {
    const pub = toPublicQuiz(FULL_QUIZ);
    expect(pub.questions[0]).not.toHaveProperty("explanation");
  });

  it("strips isPublished from top level", () => {
    const pub = toPublicQuiz(FULL_QUIZ);
    expect(pub).not.toHaveProperty("isPublished");
  });

  it("preserves question order and options", () => {
    const pub = toPublicQuiz(FULL_QUIZ);
    expect(pub.questions).toHaveLength(2);
    expect(pub.questions[0].id).toBe("q-1");
    expect(pub.questions[0].options).toEqual(["1", "2", "3", "4"]);
    expect(pub.questions[1].id).toBe("q-2");
  });

  it("preserves top-level display fields", () => {
    const pub = toPublicQuiz(FULL_QUIZ);
    expect(pub.id).toBe("quiz-1");
    expect(pub.title).toBe("My Quiz");
    expect(pub.description).toBe("desc");
    expect(pub.timeLimit).toBe(300);
    expect(pub.randomize).toBe(false);
    expect(pub.shareCode).toBe("abc123XYZ0");
  });
});

// ---------------------------------------------------------------------------
// getQuizForEditor
// ---------------------------------------------------------------------------
describe("getQuizForEditor", () => {
  const QUIZ_ROW = {
    id: "quiz-1",
    userId: "user-1",
    title: "My Quiz",
    description: "desc",
    timeLimit: 300,
    randomize: false,
    isPublished: false,
    shareCode: "abc123XYZ0",
    createdAt: new Date("2024-01-01T00:00:00Z"),
  };
  const QUESTION_ROWS = [
    {
      id: "q-1",
      quizId: "quiz-1",
      prompt: "What?",
      optionsJson: '["a","b","c","d"]',
      correctIndex: 0,
      explanation: "yes",
      sortOrder: 0,
    },
    {
      id: "q-2",
      quizId: "quiz-1",
      prompt: "How?",
      optionsJson: '["w","x","y","z"]',
      correctIndex: 2,
      explanation: null,
      sortOrder: 1,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findFirstQuiz.mockResolvedValue(QUIZ_ROW);
    // Wire up select chain for questions (detail query: .from → .where → .orderBy)
    const orderByMock = vi.fn().mockResolvedValue(QUESTION_ROWS);
    const whereMock = vi.fn().mockReturnValue({ orderBy: orderByMock });
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    mocks.select.mockReturnValue({ from: fromMock });
  });

  it("missing quiz → null", async () => {
    mocks.findFirstQuiz.mockResolvedValue(undefined);
    const result = await getQuizForEditor("quiz-1", "user-1");
    expect(result).toBeNull();
  });

  it("wrong owner → null (same as missing — non-disclosure)", async () => {
    mocks.findFirstQuiz.mockResolvedValue({
      ...QUIZ_ROW,
      userId: "other-user",
    });
    const result = await getQuizForEditor("quiz-1", "user-1");
    expect(result).toBeNull();
  });

  it("owner match → returns QuizDetail with parsed options and sortOrder order", async () => {
    const result = await getQuizForEditor("quiz-1", "user-1");
    expect(result).not.toBeNull();
    expect(result!.questions).toHaveLength(2);
    expect(result!.questions[0].options).toEqual(["a", "b", "c", "d"]);
    expect(result!.questions[1].options).toEqual(["w", "x", "y", "z"]);
    expect(result!.questions[0].sortOrder).toBe(0);
    expect(result!.questions[1].sortOrder).toBe(1);
  });

  it("returned detail has correctIndex intact (editor needs it)", async () => {
    const result = await getQuizForEditor("quiz-1", "user-1");
    expect(result!.questions[0].correctIndex).toBe(0);
    expect(result!.questions[1].correctIndex).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// getPublishedQuiz
// ---------------------------------------------------------------------------
describe("getPublishedQuiz", () => {
  const QUIZ_ROW = {
    id: "quiz-1",
    userId: "user-1",
    title: "My Quiz",
    description: "desc",
    timeLimit: 300,
    randomize: false,
    isPublished: true,
    shareCode: "abc123XYZ0",
    createdAt: new Date("2024-01-01T00:00:00Z"),
  };
  const QUESTION_ROWS = [
    {
      id: "q-1",
      quizId: "quiz-1",
      prompt: "What?",
      optionsJson: '["a","b","c","d"]',
      correctIndex: 0,
      explanation: "yes",
      sortOrder: 0,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findFirstQuiz.mockResolvedValue(QUIZ_ROW);
    // Wire up select chain for questions (detail query: .from → .where → .orderBy)
    const orderByMock = vi.fn().mockResolvedValue(QUESTION_ROWS);
    const whereMock = vi.fn().mockReturnValue({ orderBy: orderByMock });
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    mocks.select.mockReturnValue({ from: fromMock });
  });

  it("missing quiz → null", async () => {
    mocks.findFirstQuiz.mockResolvedValue(undefined);
    const result = await getPublishedQuiz("abc123XYZ0");
    expect(result).toBeNull();
  });

  it("unpublished quiz → null", async () => {
    mocks.findFirstQuiz.mockResolvedValue({ ...QUIZ_ROW, isPublished: false });
    const result = await getPublishedQuiz("abc123XYZ0");
    expect(result).toBeNull();
  });

  it("published quiz → full data with correctIndex intact", async () => {
    const result = await getPublishedQuiz("abc123XYZ0");
    expect(result).not.toBeNull();
    expect(result!.questions[0].correctIndex).toBe(0);
    expect(result!.questions[0].explanation).toBe("yes");
    expect(result!.questions[0].options).toEqual(["a", "b", "c", "d"]);
  });
});

// ---------------------------------------------------------------------------
// getUserQuizList
// ---------------------------------------------------------------------------
describe("getUserQuizList", () => {
  const LIST_ROWS = [
    {
      id: "quiz-1",
      title: "Quiz A",
      description: null,
      timeLimit: null,
      randomize: false,
      isPublished: true,
      shareCode: "abc123XYZ0",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      attemptCount: 3,
      avgScoreRatio: "0.6",
      completedCount: 2,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    const orderByMock = vi.fn().mockResolvedValue(LIST_ROWS);
    const groupByMock = vi.fn().mockReturnValue({ orderBy: orderByMock });
    const whereMock = vi.fn().mockReturnValue({ groupBy: groupByMock });
    const leftJoinMock = vi.fn().mockReturnValue({ where: whereMock });
    const fromMock = vi.fn().mockReturnValue({ leftJoin: leftJoinMock });
    mocks.select.mockReturnValue({ from: fromMock });
  });

  it("returns mapped list items", async () => {
    const result = await getUserQuizList("user-1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("quiz-1");
    expect(result[0].attemptCount).toBe(3);
    expect(result[0].averageScore).toBe(0.6);
    expect(result[0].completionRate).toBeCloseTo(2 / 3);
  });
});
