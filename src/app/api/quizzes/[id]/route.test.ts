import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/quizzes/[id]/route";

vi.spyOn(console, "info").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getQuizForEditor: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSession: mocks.getSession }));
vi.mock("@/lib/quiz", () => ({ getQuizForEditor: mocks.getQuizForEditor }));

const DETAIL = {
  id: "quiz-1",
  title: "My Quiz",
  description: null,
  timeLimit: null,
  randomize: false,
  isPublished: false,
  shareCode: "abc123XYZ0",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  questions: [],
};
const SESSION = { user: { id: "user-1" } };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue(SESSION);
  mocks.getQuizForEditor.mockResolvedValue(DETAIL);
});

describe("GET /api/quizzes/[id]", () => {
  it("no session → 401 UNAUTHORIZED", async () => {
    mocks.getSession.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/quizzes/quiz-1"), {
      params: Promise.resolve({ id: "quiz-1" }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({
      error: { code: "UNAUTHORIZED", message: expect.any(String) },
    });
  });

  it("empty id → 400 VALIDATION_ERROR", async () => {
    const res = await GET(new Request("http://localhost/api/quizzes/"), {
      params: Promise.resolve({ id: "" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({
      error: { code: "VALIDATION_ERROR", message: expect.any(String) },
    });
  });

  it("quiz not found (null from helper) → 404 NOT_FOUND", async () => {
    mocks.getQuizForEditor.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/quizzes/quiz-1"), {
      params: Promise.resolve({ id: "quiz-1" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({
      error: { code: "NOT_FOUND", message: "Quiz not found" },
    });
  });

  it("happy path → 200 with QuizDetail including questions with answers", async () => {
    const res = await GET(new Request("http://localhost/api/quizzes/quiz-1"), {
      params: Promise.resolve({ id: "quiz-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ id: "quiz-1", title: "My Quiz" });
    expect(mocks.getQuizForEditor).toHaveBeenCalledWith("quiz-1", "user-1");
  });

  it("getQuizForEditor rejects → 500 INTERNAL", async () => {
    mocks.getQuizForEditor.mockRejectedValue(new Error("db error"));
    const res = await GET(new Request("http://localhost/api/quizzes/quiz-1"), {
      params: Promise.resolve({ id: "quiz-1" }),
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({
      error: { code: "INTERNAL", message: expect.any(String) },
    });
  });
});
