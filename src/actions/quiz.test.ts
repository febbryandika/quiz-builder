import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQuiz, deleteQuiz, updateQuiz } from "@/actions/quiz";

// Module-top-level console spies — silence logs while staying assertable
vi.spyOn(console, "info").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

const mocks = vi.hoisted(() => {
  const insertReturning = vi.fn();
  const insertValues = vi.fn(() => ({ returning: insertReturning }));
  const updateWhere = vi.fn();
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const deleteWhere = vi.fn();
  return {
    getSession: vi.fn(),
    revalidatePath: vi.fn(),
    findFirst: vi.fn(),
    insert: vi.fn(() => ({ values: insertValues })),
    insertValues,
    insertReturning,
    update: vi.fn(() => ({ set: updateSet })),
    updateSet,
    updateWhere,
    delete: vi.fn(() => ({ where: deleteWhere })),
    deleteWhere,
  };
});

vi.mock("@/db", () => ({
  db: {
    query: { quizzes: { findFirst: mocks.findFirst } },
    insert: mocks.insert,
    update: mocks.update,
    delete: mocks.delete,
  },
}));
vi.mock("@/lib/session", () => ({ getSession: mocks.getSession }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

const SESSION = { user: { id: "user-1" } };
const QUIZ = { id: "quiz-1", userId: "user-1", shareCode: "abc123XYZ0" };

beforeEach(() => {
  vi.clearAllMocks();
  // Re-seed happy-path defaults after clearAllMocks wipes call counts
  mocks.getSession.mockResolvedValue(SESSION);
  mocks.findFirst.mockResolvedValue(QUIZ);
  mocks.insertReturning.mockResolvedValue([{ id: "quiz-1" }]);
});

const VALID_QUIZ_INPUT = {
  title: "My quiz",
  description: "desc",
  timeLimit: 300,
  randomize: false,
};

// ---------------------------------------------------------------------------
// createQuiz (6 cases)
// ---------------------------------------------------------------------------
describe("createQuiz", () => {
  it("no session → UNAUTHORIZED, insert+revalidate not called", async () => {
    mocks.getSession.mockResolvedValue(null);
    const result = await createQuiz(VALID_QUIZ_INPUT);
    expect(result).toEqual({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in" },
    });
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("invalid title → VALIDATION_ERROR", async () => {
    const result = await createQuiz({ ...VALID_QUIZ_INPUT, title: "ab" });
    expect(result).toEqual({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: expect.any(String) },
    });
  });

  it("success → ok true, insertValues gets parsed data + userId", async () => {
    const result = await createQuiz(VALID_QUIZ_INPUT);
    expect(result).toEqual({ ok: true, data: { id: "quiz-1" } });
    expect(mocks.insertValues).toHaveBeenCalledWith({
      ...VALID_QUIZ_INPUT,
      userId: "user-1",
    });
  });

  it("success → revalidates exactly ['/dashboard']", async () => {
    await createQuiz(VALID_QUIZ_INPUT);
    const paths = mocks.revalidatePath.mock.calls.map((c) => c[0]);
    expect(paths).toEqual(["/dashboard"]);
  });

  it("trimmed title is persisted (parsed output, not raw input)", async () => {
    await createQuiz({ ...VALID_QUIZ_INPUT, title: "  My quiz  " });
    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ title: "My quiz" }),
    );
  });

  it("omitted description stays undefined in values", async () => {
    await createQuiz({ title: "My quiz", timeLimit: 60, randomize: false });
    // toEqual semantics ignore undefined keys but catch null/"" writes
    expect(mocks.insertValues).toHaveBeenCalledWith({
      title: "My quiz",
      timeLimit: 60,
      randomize: false,
      userId: "user-1",
    });
  });

  it("insert rejects → INTERNAL (generic message), no revalidate, console.error called", async () => {
    mocks.insertReturning.mockRejectedValue(new Error("boom"));
    const result = await createQuiz(VALID_QUIZ_INPUT);
    expect(result).toEqual({
      ok: false,
      error: {
        code: "INTERNAL",
        message: "Something went wrong. Please try again.",
      },
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updateQuiz (11 cases)
// ---------------------------------------------------------------------------
describe("updateQuiz", () => {
  it("no session → UNAUTHORIZED, findFirst not called", async () => {
    mocks.getSession.mockResolvedValue(null);
    const result = await updateQuiz("quiz-1", { title: "New title" });
    expect(result).toEqual({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in" },
    });
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it("{} → VALIDATION_ERROR, findFirst not called", async () => {
    const result = await updateQuiz("quiz-1", {});
    expect(result).toEqual({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: expect.any(String) },
    });
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it("{title: undefined} → VALIDATION_ERROR", async () => {
    const result = await updateQuiz("quiz-1", { title: undefined });
    expect(result).toEqual({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: expect.any(String) },
    });
  });

  it('{title: "ab"} → VALIDATION_ERROR', async () => {
    const result = await updateQuiz("quiz-1", { title: "ab" });
    expect(result).toEqual({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: expect.any(String) },
    });
  });

  it('id: "" → VALIDATION_ERROR', async () => {
    const result = await updateQuiz("", { title: "New title" });
    expect(result).toEqual({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: expect.any(String) },
    });
  });

  it("missing quiz → NOT_FOUND, update not called", async () => {
    mocks.findFirst.mockResolvedValue(undefined);
    const result = await updateQuiz("quiz-1", { title: "New title" });
    expect(result).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "Quiz not found" },
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("wrong owner → NOT_FOUND deep-equal to missing-quiz error, update not called", async () => {
    mocks.findFirst.mockResolvedValue(undefined);
    const missingResult = await updateQuiz("quiz-1", { title: "New title" });
    mocks.findFirst.mockResolvedValue({ ...QUIZ, userId: "other-user" });
    const wrongOwnerResult = await updateQuiz("quiz-1", { title: "New title" });
    expect(wrongOwnerResult).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "Quiz not found" },
    });
    // Existence non-disclosure (SPEC §7): foreign quiz is indistinguishable from missing
    expect(wrongOwnerResult).toEqual(missingResult);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('{title: "New title"} → updateSet called with exactly that, correct revalidatePaths', async () => {
    const result = await updateQuiz("quiz-1", { title: "New title" });
    expect(result).toEqual({ ok: true, data: { id: "quiz-1" } });
    expect(mocks.updateSet).toHaveBeenCalledWith({ title: "New title" });
    const paths = mocks.revalidatePath.mock.calls.map((c) => c[0]);
    expect(paths).toEqual([
      "/dashboard",
      "/quizzes/quiz-1/edit",
      "/q/abc123XYZ0",
    ]);
  });

  it("{isPublished: true} toggle works + public path revalidated", async () => {
    const result = await updateQuiz("quiz-1", { isPublished: true });
    expect(result).toEqual({ ok: true, data: { id: "quiz-1" } });
    expect(mocks.updateSet).toHaveBeenCalledWith({ isPublished: true });
    const paths = mocks.revalidatePath.mock.calls.map((c) => c[0]);
    expect(paths).toContain("/q/abc123XYZ0");
  });

  it("{timeLimit: null} reaches .set() (null clears, not dropped)", async () => {
    await updateQuiz("quiz-1", { timeLimit: null });
    expect(mocks.updateSet).toHaveBeenCalledWith({ timeLimit: null });
  });

  it("update rejects → INTERNAL, no revalidate", async () => {
    mocks.updateWhere.mockRejectedValue(new Error("boom"));
    const result = await updateQuiz("quiz-1", { title: "New title" });
    expect(result).toEqual({
      ok: false,
      error: {
        code: "INTERNAL",
        message: "Something went wrong. Please try again.",
      },
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deleteQuiz (7 cases)
// ---------------------------------------------------------------------------
describe("deleteQuiz", () => {
  it("no session → UNAUTHORIZED", async () => {
    mocks.getSession.mockResolvedValue(null);
    const result = await deleteQuiz("quiz-1");
    expect(result).toEqual({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in" },
    });
  });

  it("empty id → VALIDATION_ERROR", async () => {
    const result = await deleteQuiz("");
    expect(result).toEqual({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: expect.any(String) },
    });
  });

  it("missing quiz → NOT_FOUND", async () => {
    mocks.findFirst.mockResolvedValue(undefined);
    const result = await deleteQuiz("quiz-1");
    expect(result).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "Quiz not found" },
    });
  });

  it("wrong owner → NOT_FOUND", async () => {
    mocks.findFirst.mockResolvedValue({ ...QUIZ, userId: "other-user" });
    const result = await deleteQuiz("quiz-1");
    expect(result).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "Quiz not found" },
    });
  });

  it("success → revalidates ['/dashboard', '/q/abc123XYZ0'], returns id", async () => {
    const result = await deleteQuiz("quiz-1");
    expect(result).toEqual({ ok: true, data: { id: "quiz-1" } });
    const paths = mocks.revalidatePath.mock.calls.map((c) => c[0]);
    expect(paths).toEqual(["/dashboard", "/q/abc123XYZ0"]);
  });

  it("findFirst rejects → INTERNAL", async () => {
    mocks.findFirst.mockRejectedValue(new Error("boom"));
    const result = await deleteQuiz("quiz-1");
    expect(result).toEqual({
      ok: false,
      error: {
        code: "INTERNAL",
        message: "Something went wrong. Please try again.",
      },
    });
    expect(console.error).toHaveBeenCalled();
  });

  it("delete rejects → INTERNAL, no revalidate", async () => {
    mocks.deleteWhere.mockRejectedValue(new Error("boom"));
    const result = await deleteQuiz("quiz-1");
    expect(result).toEqual({
      ok: false,
      error: {
        code: "INTERNAL",
        message: "Something went wrong. Please try again.",
      },
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
