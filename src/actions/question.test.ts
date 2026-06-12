import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addQuestion,
  deleteQuestion,
  reorderQuestions,
  updateQuestion,
} from "@/actions/question";

// Module-top-level console spies — silence logs while staying assertable
vi.spyOn(console, "info").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

const mocks = vi.hoisted(() => {
  const insertReturning = vi.fn();
  const insertValues = vi.fn(() => ({ returning: insertReturning }));
  const updateWhere = vi.fn();
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const deleteWhere = vi.fn();
  const selectFrom = vi.fn();
  const selectWhere = vi.fn();
  selectFrom.mockReturnValue({ where: selectWhere });
  return {
    getSession: vi.fn(),
    revalidatePath: vi.fn(),
    findFirstQuiz: vi.fn(),
    findFirstQuestion: vi.fn(),
    insert: vi.fn(() => ({ values: insertValues })),
    insertValues,
    insertReturning,
    update: vi.fn(() => ({ set: updateSet })),
    updateSet,
    updateWhere,
    delete: vi.fn(() => ({ where: deleteWhere })),
    deleteWhere,
    select: vi.fn(() => ({ from: selectFrom })),
    selectFrom,
    selectWhere,
    transaction: vi.fn(),
  };
});

vi.mock("@/db", () => ({
  db: {
    query: {
      quizzes: { findFirst: mocks.findFirstQuiz },
      questions: { findFirst: mocks.findFirstQuestion },
    },
    insert: mocks.insert,
    update: mocks.update,
    delete: mocks.delete,
    select: mocks.select,
    transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/session", () => ({ getSession: mocks.getSession }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

const SESSION = { user: { id: "user-1" } };
const QUIZ = { id: "quiz-1", userId: "user-1", shareCode: "abc123XYZ0" };
const QUESTION = {
  id: "q-1",
  quizId: "quiz-1",
  prompt: "What?",
  optionsJson: '["a","b","c","d"]',
  correctIndex: 0,
  explanation: null,
  sortOrder: 0,
};

const VALID_QUESTION_INPUT = {
  prompt: "What is 2+2?",
  options: ["1", "2", "3", "4"],
  correctIndex: 3,
  explanation: "Basic addition",
};

beforeEach(() => {
  vi.clearAllMocks();
  // Re-seed happy-path defaults after clearAllMocks wipes call counts
  mocks.getSession.mockResolvedValue(SESSION);
  mocks.findFirstQuiz.mockResolvedValue(QUIZ);
  mocks.findFirstQuestion.mockResolvedValue(QUESTION);
  mocks.insertReturning.mockResolvedValue([{ id: "q-new" }]);
  mocks.selectWhere.mockResolvedValue([{ count: 0, maxSort: null }]);
  // Re-seed all chains (clearAllMocks wipes mockReturnValue/mockImplementation too)
  mocks.insert.mockReturnValue({ values: mocks.insertValues });
  mocks.insertValues.mockReturnValue({ returning: mocks.insertReturning });
  mocks.select.mockReturnValue({ from: mocks.selectFrom });
  mocks.selectFrom.mockReturnValue({ where: mocks.selectWhere });
  mocks.update.mockReturnValue({ set: mocks.updateSet });
  mocks.updateSet.mockReturnValue({ where: mocks.updateWhere });
  mocks.delete.mockReturnValue({ where: mocks.deleteWhere });
  // clearAllMocks keeps implementations: terminal mocks poisoned by
  // mockRejectedValue in earlier tests must be restored to resolving defaults
  mocks.updateWhere.mockResolvedValue(undefined);
  mocks.deleteWhere.mockResolvedValue(undefined);
  // transaction routes callbacks through to the same update spies
  mocks.transaction.mockImplementation(
    async (cb: (tx: unknown) => Promise<void>) => cb({ update: mocks.update }),
  );
});

// ---------------------------------------------------------------------------
// addQuestion (10 cases)
// ---------------------------------------------------------------------------
describe("addQuestion", () => {
  it("no session → UNAUTHORIZED, insert not called", async () => {
    mocks.getSession.mockResolvedValue(null);
    const result = await addQuestion("quiz-1", VALID_QUESTION_INPUT);
    expect(result).toEqual({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in" },
    });
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it('empty quizId "" → VALIDATION_ERROR', async () => {
    const result = await addQuestion("", VALID_QUESTION_INPUT);
    expect(result).toEqual({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: expect.any(String) },
    });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("invalid input (options count 3) → VALIDATION_ERROR", async () => {
    const result = await addQuestion("quiz-1", {
      ...VALID_QUESTION_INPUT,
      options: ["a", "b", "c"],
    });
    expect(result).toEqual({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: expect.any(String) },
    });
  });

  it("invalid input (correctIndex 4) → VALIDATION_ERROR", async () => {
    const result = await addQuestion("quiz-1", {
      ...VALID_QUESTION_INPUT,
      correctIndex: 4,
    });
    expect(result).toEqual({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: expect.any(String) },
    });
  });

  it("quiz missing → NOT_FOUND 'Quiz not found', insert not called", async () => {
    mocks.findFirstQuiz.mockResolvedValue(undefined);
    const result = await addQuestion("quiz-1", VALID_QUESTION_INPUT);
    expect(result).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "Quiz not found" },
    });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("wrong owner → NOT_FOUND 'Quiz not found', insert not called", async () => {
    mocks.findFirstQuiz.mockResolvedValue({ ...QUIZ, userId: "other-user" });
    const result = await addQuestion("quiz-1", VALID_QUESTION_INPUT);
    expect(result).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "Quiz not found" },
    });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("count=50 → VALIDATION_ERROR cap, insert not called", async () => {
    mocks.selectWhere.mockResolvedValue([{ count: 50, maxSort: 49 }]);
    const result = await addQuestion("quiz-1", VALID_QUESTION_INPUT);
    expect(result).toEqual({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "A quiz can have at most 50 questions",
      },
    });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("empty quiz (maxSort=null) → sortOrder 0, optionsJson serialized", async () => {
    mocks.selectWhere.mockResolvedValue([{ count: 0, maxSort: null }]);
    await addQuestion("quiz-1", VALID_QUESTION_INPUT);
    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        sortOrder: 0,
        optionsJson: JSON.stringify(VALID_QUESTION_INPUT.options),
      }),
    );
  });

  it("gaps (count=3, maxSort=4) → sortOrder 5", async () => {
    mocks.selectWhere.mockResolvedValue([{ count: 3, maxSort: 4 }]);
    await addQuestion("quiz-1", VALID_QUESTION_INPUT);
    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ sortOrder: 5 }),
    );
  });

  it("happy path → ok true, id returned, revalidatePath ×3", async () => {
    const result = await addQuestion("quiz-1", VALID_QUESTION_INPUT);
    expect(result).toEqual({ ok: true, data: { id: "q-new" } });
    const paths = mocks.revalidatePath.mock.calls.map((c) => c[0]);
    expect(paths).toEqual([
      "/dashboard",
      "/quizzes/quiz-1/edit",
      "/q/abc123XYZ0",
    ]);
  });

  it("insert rejects → INTERNAL, no revalidate, console.error called", async () => {
    mocks.insertReturning.mockRejectedValue(new Error("boom"));
    const result = await addQuestion("quiz-1", VALID_QUESTION_INPUT);
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
// updateQuestion (11 cases)
// ---------------------------------------------------------------------------
describe("updateQuestion", () => {
  it("no session → UNAUTHORIZED, findFirst not called", async () => {
    mocks.getSession.mockResolvedValue(null);
    const result = await updateQuestion("q-1", { prompt: "New?" });
    expect(result).toEqual({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in" },
    });
    expect(mocks.findFirstQuestion).not.toHaveBeenCalled();
  });

  it('{} → VALIDATION_ERROR "At least one field must be provided"', async () => {
    const result = await updateQuestion("q-1", {});
    expect(result).toEqual({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: expect.any(String) },
    });
    expect(mocks.findFirstQuestion).not.toHaveBeenCalled();
  });

  it("{prompt: undefined} → VALIDATION_ERROR", async () => {
    const result = await updateQuestion("q-1", { prompt: undefined });
    expect(result).toEqual({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: expect.any(String) },
    });
  });

  it('empty questionId "" → VALIDATION_ERROR', async () => {
    const result = await updateQuestion("", { prompt: "New?" });
    expect(result).toEqual({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: expect.any(String) },
    });
  });

  it("question missing → NOT_FOUND 'Question not found', update not called", async () => {
    mocks.findFirstQuestion.mockResolvedValue(undefined);
    const result = await updateQuestion("q-1", { prompt: "New?" });
    expect(result).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "Question not found" },
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("parent quiz missing → NOT_FOUND 'Question not found' (uniform), update not called", async () => {
    mocks.findFirstQuiz.mockResolvedValue(undefined);
    const result = await updateQuestion("q-1", { prompt: "New?" });
    expect(result).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "Question not found" },
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("wrong owner → NOT_FOUND 'Question not found', update not called", async () => {
    mocks.findFirstQuiz.mockResolvedValue({ ...QUIZ, userId: "other-user" });
    const result = await updateQuestion("q-1", { prompt: "New?" });
    expect(result).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "Question not found" },
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("prompt-only patch → .set() called with exactly {prompt}", async () => {
    const result = await updateQuestion("q-1", { prompt: "New prompt?" });
    expect(result).toEqual({ ok: true, data: { id: "q-1" } });
    expect(mocks.updateSet).toHaveBeenCalledWith({ prompt: "New prompt?" });
  });

  it("options-only patch → .set() called with optionsJson serialized", async () => {
    const opts = ["w", "x", "y", "z"];
    await updateQuestion("q-1", { options: opts });
    expect(mocks.updateSet).toHaveBeenCalledWith({
      optionsJson: JSON.stringify(opts),
    });
  });

  it("happy path → revalidatePath ×3", async () => {
    await updateQuestion("q-1", { prompt: "New?" });
    const paths = mocks.revalidatePath.mock.calls.map((c) => c[0]);
    expect(paths).toEqual([
      "/dashboard",
      "/quizzes/quiz-1/edit",
      "/q/abc123XYZ0",
    ]);
  });

  it("update rejects → INTERNAL, no revalidate", async () => {
    mocks.updateWhere.mockRejectedValue(new Error("boom"));
    const result = await updateQuestion("q-1", { prompt: "New?" });
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
// deleteQuestion (8 cases)
// ---------------------------------------------------------------------------
describe("deleteQuestion", () => {
  it("no session → UNAUTHORIZED", async () => {
    mocks.getSession.mockResolvedValue(null);
    const result = await deleteQuestion("q-1");
    expect(result).toEqual({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in" },
    });
  });

  it('empty id "" → VALIDATION_ERROR', async () => {
    const result = await deleteQuestion("");
    expect(result).toEqual({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: expect.any(String) },
    });
  });

  it("question missing → NOT_FOUND 'Question not found', delete not called", async () => {
    mocks.findFirstQuestion.mockResolvedValue(undefined);
    const result = await deleteQuestion("q-1");
    expect(result).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "Question not found" },
    });
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("parent quiz missing → NOT_FOUND 'Question not found', delete not called", async () => {
    mocks.findFirstQuiz.mockResolvedValue(undefined);
    const result = await deleteQuestion("q-1");
    expect(result).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "Question not found" },
    });
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("wrong owner → NOT_FOUND 'Question not found', delete not called", async () => {
    mocks.findFirstQuiz.mockResolvedValue({ ...QUIZ, userId: "other-user" });
    const result = await deleteQuestion("q-1");
    expect(result).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "Question not found" },
    });
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("happy path → ok true, id returned, revalidatePath ×3", async () => {
    const result = await deleteQuestion("q-1");
    expect(result).toEqual({ ok: true, data: { id: "q-1" } });
    const paths = mocks.revalidatePath.mock.calls.map((c) => c[0]);
    expect(paths).toEqual([
      "/dashboard",
      "/quizzes/quiz-1/edit",
      "/q/abc123XYZ0",
    ]);
  });

  it("findFirst rejects → INTERNAL, console.error called", async () => {
    mocks.findFirstQuestion.mockRejectedValue(new Error("boom"));
    const result = await deleteQuestion("q-1");
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
    const result = await deleteQuestion("q-1");
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
// reorderQuestions (9 cases)
// ---------------------------------------------------------------------------
describe("reorderQuestions", () => {
  beforeEach(() => {
    // Default: two questions in the quiz
    mocks.selectWhere.mockResolvedValue([{ id: "q-a" }, { id: "q-b" }]);
  });

  it("no session → UNAUTHORIZED", async () => {
    mocks.getSession.mockResolvedValue(null);
    const result = await reorderQuestions({
      quizId: "quiz-1",
      questionIds: ["q-a", "q-b"],
    });
    expect(result).toEqual({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in" },
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("empty quizId → VALIDATION_ERROR", async () => {
    const result = await reorderQuestions({
      quizId: "",
      questionIds: ["q-a"],
    });
    expect(result).toEqual({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: expect.any(String) },
    });
  });

  it("questionIds: [] → VALIDATION_ERROR", async () => {
    const result = await reorderQuestions({
      quizId: "quiz-1",
      questionIds: [],
    });
    expect(result).toEqual({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: expect.any(String) },
    });
  });

  it("quiz missing → NOT_FOUND 'Quiz not found', transaction not called", async () => {
    mocks.findFirstQuiz.mockResolvedValue(undefined);
    const result = await reorderQuestions({
      quizId: "quiz-1",
      questionIds: ["q-a", "q-b"],
    });
    expect(result).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "Quiz not found" },
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("wrong owner → NOT_FOUND 'Quiz not found', transaction not called", async () => {
    mocks.findFirstQuiz.mockResolvedValue({ ...QUIZ, userId: "other-user" });
    const result = await reorderQuestions({
      quizId: "quiz-1",
      questionIds: ["q-a", "q-b"],
    });
    expect(result).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "Quiz not found" },
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("duplicate id in questionIds → VALIDATION_ERROR, transaction not called", async () => {
    const result = await reorderQuestions({
      quizId: "quiz-1",
      questionIds: ["q-a", "q-a"],
    });
    expect(result).toEqual({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "questionIds must match the quiz's questions exactly",
      },
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("unknown id in questionIds → VALIDATION_ERROR, transaction not called", async () => {
    const result = await reorderQuestions({
      quizId: "quiz-1",
      questionIds: ["q-a", "q-unknown"],
    });
    expect(result).toEqual({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "questionIds must match the quiz's questions exactly",
      },
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("wrong count → VALIDATION_ERROR, transaction not called", async () => {
    const result = await reorderQuestions({
      quizId: "quiz-1",
      questionIds: ["q-a"],
    });
    expect(result).toEqual({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "questionIds must match the quiz's questions exactly",
      },
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("happy path → transaction called, per-index set calls, revalidatePath ×3, ok true", async () => {
    const result = await reorderQuestions({
      quizId: "quiz-1",
      questionIds: ["q-b", "q-a"],
    });
    expect(result).toEqual({ ok: true, data: { id: "quiz-1" } });
    // transaction was invoked
    expect(mocks.transaction).toHaveBeenCalled();
    // update was called once per question (index 0 = q-b, index 1 = q-a)
    expect(mocks.update).toHaveBeenCalledTimes(2);
    expect(mocks.updateSet).toHaveBeenNthCalledWith(1, { sortOrder: 0 });
    expect(mocks.updateSet).toHaveBeenNthCalledWith(2, { sortOrder: 1 });
    const paths = mocks.revalidatePath.mock.calls.map((c) => c[0]);
    expect(paths).toEqual([
      "/dashboard",
      "/quizzes/quiz-1/edit",
      "/q/abc123XYZ0",
    ]);
  });

  it("transaction rejects → INTERNAL, no revalidate", async () => {
    mocks.transaction.mockRejectedValue(new Error("boom"));
    const result = await reorderQuestions({
      quizId: "quiz-1",
      questionIds: ["q-a", "q-b"],
    });
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
