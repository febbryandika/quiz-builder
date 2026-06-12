import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/quizzes/route";

vi.spyOn(console, "info").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUserQuizList: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSession: mocks.getSession }));
vi.mock("@/lib/quiz", () => ({ getUserQuizList: mocks.getUserQuizList }));

const LIST = [
  {
    id: "quiz-1",
    title: "My Quiz",
    attemptCount: 0,
    averageScore: null,
    completionRate: null,
  },
];
const SESSION = { user: { id: "user-1" } };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue(SESSION);
  mocks.getUserQuizList.mockResolvedValue(LIST);
});

describe("GET /api/quizzes", () => {
  it("no session → 401 UNAUTHORIZED", async () => {
    mocks.getSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({
      error: { code: "UNAUTHORIZED", message: expect.any(String) },
    });
  });

  it("happy path → 200 with quiz list", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(LIST);
    expect(mocks.getUserQuizList).toHaveBeenCalledWith("user-1");
  });

  it("getUserQuizList rejects → 500 INTERNAL", async () => {
    mocks.getUserQuizList.mockRejectedValue(new Error("db error"));
    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({
      error: { code: "INTERNAL", message: expect.any(String) },
    });
  });
});
