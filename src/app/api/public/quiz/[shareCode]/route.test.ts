import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  GET,
  dynamic,
  revalidate,
} from "@/app/api/public/quiz/[shareCode]/route";

vi.spyOn(console, "info").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

const mocks = vi.hoisted(() => ({
  getPublishedQuiz: vi.fn(),
  toPublicQuiz: vi.fn(),
}));

vi.mock("@/lib/quiz", () => ({
  getPublishedQuiz: mocks.getPublishedQuiz,
  toPublicQuiz: mocks.toPublicQuiz,
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
      prompt: "What?",
      options: ["a", "b", "c", "d"],
      correctIndex: 0,
      explanation: "yes",
      sortOrder: 0,
    },
  ],
};

const PUBLIC = {
  id: "quiz-1",
  title: "My Quiz",
  description: null,
  timeLimit: null,
  randomize: false,
  shareCode: "abc123XYZ0",
  questions: [{ id: "q-1", prompt: "What?", options: ["a", "b", "c", "d"] }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getPublishedQuiz.mockResolvedValue(DETAIL);
  mocks.toPublicQuiz.mockReturnValue(PUBLIC);
});

describe("GET /api/public/quiz/[shareCode]", () => {
  it("segment config: dynamic === 'force-static'", () => {
    expect(dynamic).toBe("force-static");
  });

  it("segment config: revalidate === 300", () => {
    expect(revalidate).toBe(300);
  });

  it("quiz not found (null) → 404 NOT_FOUND", async () => {
    mocks.getPublishedQuiz.mockResolvedValue(null);
    const res = await GET(
      new Request("http://localhost/api/public/quiz/abc123XYZ0"),
      {
        params: Promise.resolve({ shareCode: "abc123XYZ0" }),
      },
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({
      error: { code: "NOT_FOUND", message: "Quiz not found" },
    });
  });

  it("happy path → 200 sanitized public quiz (no correctIndex/explanation)", async () => {
    const res = await GET(
      new Request("http://localhost/api/public/quiz/abc123XYZ0"),
      {
        params: Promise.resolve({ shareCode: "abc123XYZ0" }),
      },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ id: "quiz-1", title: "My Quiz" });
    // body comes from toPublicQuiz — assert it was called with the detail
    expect(mocks.toPublicQuiz).toHaveBeenCalledWith(DETAIL);
  });

  it("body security: no correctIndex in questions", async () => {
    const res = await GET(
      new Request("http://localhost/api/public/quiz/abc123XYZ0"),
      {
        params: Promise.resolve({ shareCode: "abc123XYZ0" }),
      },
    );
    const body = await res.json();
    expect(body.questions).toHaveLength(1);
    expect(body.questions[0]).not.toHaveProperty("correctIndex");
    expect(body.questions[0]).not.toHaveProperty("explanation");
  });

  it("body security: no isPublished at top level", async () => {
    const res = await GET(
      new Request("http://localhost/api/public/quiz/abc123XYZ0"),
      {
        params: Promise.resolve({ shareCode: "abc123XYZ0" }),
      },
    );
    const body = await res.json();
    expect(body).not.toHaveProperty("isPublished");
  });

  it("getPublishedQuiz rejects → 500 INTERNAL", async () => {
    mocks.getPublishedQuiz.mockRejectedValue(new Error("db error"));
    const res = await GET(
      new Request("http://localhost/api/public/quiz/abc123XYZ0"),
      {
        params: Promise.resolve({ shareCode: "abc123XYZ0" }),
      },
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({
      error: { code: "INTERNAL", message: expect.any(String) },
    });
  });
});
