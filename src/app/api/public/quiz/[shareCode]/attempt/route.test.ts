import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  POST,
  dynamic,
} from "@/app/api/public/quiz/[shareCode]/attempt/route";

vi.spyOn(console, "info").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

const mocks = vi.hoisted(() => ({
  getPublishedQuiz: vi.fn(),
  insert: vi.fn(),
  insertValues: vi.fn(),
}));

vi.mock("@/lib/quiz", () => ({
  getPublishedQuiz: mocks.getPublishedQuiz,
}));

vi.mock("@/db", () => ({
  db: { insert: mocks.insert },
}));

const DETAIL = {
  id: "quiz-1",
  title: "My Quiz",
  description: null,
  timeLimit: null,
  randomize: false,
  isPublished: true,
  shareCode: "abc123XYZ0",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  questions: [
    {
      id: "q-1",
      prompt: "Q0",
      options: ["a", "b", "c", "d"],
      correctIndex: 0,
      explanation: "e0",
      sortOrder: 0,
    },
    {
      id: "q-2",
      prompt: "Q1",
      options: ["a", "b", "c", "d"],
      correctIndex: 1,
      explanation: null,
      sortOrder: 1,
    },
    {
      id: "q-3",
      prompt: "Q2",
      options: ["a", "b", "c", "d"],
      correctIndex: 2,
      explanation: "e2",
      sortOrder: 2,
    },
  ],
};

function post(shareCode: string, body: unknown, rawBody?: string) {
  return POST(
    new Request(`http://localhost/api/public/quiz/${shareCode}/attempt`, {
      method: "POST",
      body: rawBody ?? JSON.stringify(body),
    }),
    { params: Promise.resolve({ shareCode }) },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getPublishedQuiz.mockResolvedValue(DETAIL);
  mocks.insert.mockReturnValue({ values: mocks.insertValues });
  mocks.insertValues.mockResolvedValue(undefined);
});

describe("POST /api/public/quiz/[shareCode]/attempt", () => {
  it("segment config: dynamic === 'force-dynamic' (never cached)", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("all correct → score === total, results in original order", async () => {
    const res = await post("abc123XYZ0", { answersJson: "[0,1,2]" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.score).toBe(3);
    expect(body.total).toBe(3);
    expect(body.results).toEqual([
      { correct: true, correctIndex: 0, explanation: "e0" },
      { correct: true, correctIndex: 1, explanation: null },
      { correct: true, correctIndex: 2, explanation: "e2" },
    ]);
    expect(mocks.insertValues).toHaveBeenCalledWith({
      quizId: "quiz-1",
      answersJson: "[0,1,2]",
      score: 3,
      total: 3,
      submittedAt: expect.any(Date),
    });
  });

  it("partial → correct score with per-question flags", async () => {
    const res = await post("abc123XYZ0", { answersJson: "[1,1,0]" });
    const body = await res.json();
    expect(body.score).toBe(1);
    expect(body.results.map((r: { correct: boolean }) => r.correct)).toEqual([
      false,
      true,
      false,
    ]);
  });

  it("unanswered (-1) scores as wrong", async () => {
    const res = await post("abc123XYZ0", { answersJson: "[-1,1,2]" });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.score).toBe(2);
    expect(body.results[0].correct).toBe(false);
  });

  it("length mismatch → 400 INVALID_ANSWERS", async () => {
    const res = await post("abc123XYZ0", { answersJson: "[0,1]" });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_ANSWERS");
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });

  it("out-of-range index (4) → 400 INVALID_ANSWERS", async () => {
    const res = await post("abc123XYZ0", { answersJson: "[4,1,2]" });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_ANSWERS");
  });

  it("answersJson not a JSON array → 400 INVALID_BODY", async () => {
    const res = await post("abc123XYZ0", { answersJson: "oops" });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_BODY");
  });

  it("missing answersJson → 400 INVALID_BODY", async () => {
    const res = await post("abc123XYZ0", {});
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_BODY");
  });

  it("malformed JSON body → 400 INVALID_BODY", async () => {
    const res = await post("abc123XYZ0", undefined, "not json}");
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_BODY");
  });

  it("quiz not found → 404 NOT_FOUND, no insert", async () => {
    mocks.getPublishedQuiz.mockResolvedValue(null);
    const res = await post("abc123XYZ0", { answersJson: "[0,1,2]" });
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });

  it("not found short-circuits before length validation (no info leak)", async () => {
    mocks.getPublishedQuiz.mockResolvedValue(null);
    // wrong length, but quiz is missing → still 404, not 400
    const res = await post("abc123XYZ0", { answersJson: "[0]" });
    expect(res.status).toBe(404);
  });

  it("db insert rejects → 500 INTERNAL", async () => {
    mocks.insertValues.mockRejectedValue(new Error("db error"));
    const res = await post("abc123XYZ0", { answersJson: "[0,1,2]" });
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("INTERNAL");
  });
});
