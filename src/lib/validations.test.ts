import { describe, expect, it } from "vitest";
import {
  MAX_QUESTIONS_PER_QUIZ,
  answersSchema,
  attemptBodySchema,
  idSchema,
  questionSchema,
  quizSchema,
  updateQuizSchema,
} from "@/lib/validations";

const validQuiz = {
  title: "My quiz",
  description: "d",
  timeLimit: 300,
  randomize: false,
};
const validQuestion = {
  prompt: "P?",
  options: ["a", "b", "c", "d"],
  correctIndex: 0,
  explanation: "e",
};

describe("quizSchema", () => {
  it("valid full payload", () => {
    expect(quizSchema.safeParse(validQuiz).success).toBe(true);
  });

  it("description omitted + timeLimit null", () => {
    expect(
      quizSchema.safeParse({
        title: "My quiz",
        timeLimit: null,
        randomize: false,
      }).success,
    ).toBe(true);
  });

  it("title len 2 fails", () => {
    expect(quizSchema.safeParse({ ...validQuiz, title: "ab" }).success).toBe(
      false,
    );
  });

  it("title len 3 passes", () => {
    expect(quizSchema.safeParse({ ...validQuiz, title: "abc" }).success).toBe(
      true,
    );
  });

  it("title len 100 passes", () => {
    expect(
      quizSchema.safeParse({ ...validQuiz, title: "a".repeat(100) }).success,
    ).toBe(true);
  });

  it("title len 101 fails", () => {
    expect(
      quizSchema.safeParse({ ...validQuiz, title: "a".repeat(101) }).success,
    ).toBe(false);
  });

  it('title "  ab  " trims to 2 fails', () => {
    expect(
      quizSchema.safeParse({ ...validQuiz, title: "  ab  " }).success,
    ).toBe(false);
  });

  it("description len 1000 passes", () => {
    expect(
      quizSchema.safeParse({ ...validQuiz, description: "a".repeat(1000) })
        .success,
    ).toBe(true);
  });

  it("description len 1001 fails", () => {
    expect(
      quizSchema.safeParse({ ...validQuiz, description: "a".repeat(1001) })
        .success,
    ).toBe(false);
  });

  it("timeLimit 0 fails", () => {
    expect(quizSchema.safeParse({ ...validQuiz, timeLimit: 0 }).success).toBe(
      false,
    );
  });

  it("timeLimit 1.5 fails", () => {
    expect(quizSchema.safeParse({ ...validQuiz, timeLimit: 1.5 }).success).toBe(
      false,
    );
  });

  it("timeLimit 60 passes", () => {
    expect(quizSchema.safeParse({ ...validQuiz, timeLimit: 60 }).success).toBe(
      true,
    );
  });

  it("randomize missing fails", () => {
    expect(
      quizSchema.safeParse({ title: "My quiz", timeLimit: 300 }).success,
    ).toBe(false);
  });
});

describe("questionSchema", () => {
  it("valid full payload", () => {
    expect(questionSchema.safeParse(validQuestion).success).toBe(true);
  });

  it("explanation omitted passes", () => {
    expect(
      questionSchema.safeParse({
        prompt: validQuestion.prompt,
        options: validQuestion.options,
        correctIndex: validQuestion.correctIndex,
      }).success,
    ).toBe(true);
  });

  it('prompt "" fails', () => {
    expect(
      questionSchema.safeParse({ ...validQuestion, prompt: "" }).success,
    ).toBe(false);
  });

  it("prompt len 500 passes", () => {
    expect(
      questionSchema.safeParse({ ...validQuestion, prompt: "a".repeat(500) })
        .success,
    ).toBe(true);
  });

  it("prompt len 501 fails", () => {
    expect(
      questionSchema.safeParse({ ...validQuestion, prompt: "a".repeat(501) })
        .success,
    ).toBe(false);
  });

  it("options count 3 fails", () => {
    expect(
      questionSchema.safeParse({ ...validQuestion, options: ["a", "b", "c"] })
        .success,
    ).toBe(false);
  });

  it("options count 4 passes", () => {
    expect(
      questionSchema.safeParse({
        ...validQuestion,
        options: ["a", "b", "c", "d"],
      }).success,
    ).toBe(true);
  });

  it("options count 5 fails", () => {
    expect(
      questionSchema.safeParse({
        ...validQuestion,
        options: ["a", "b", "c", "d", "e"],
      }).success,
    ).toBe(false);
  });

  it("one option len 200 passes", () => {
    expect(
      questionSchema.safeParse({
        ...validQuestion,
        options: ["a".repeat(200), "b", "c", "d"],
      }).success,
    ).toBe(true);
  });

  it("one option len 201 fails", () => {
    expect(
      questionSchema.safeParse({
        ...validQuestion,
        options: ["a".repeat(201), "b", "c", "d"],
      }).success,
    ).toBe(false);
  });

  it('one option "" fails', () => {
    expect(
      questionSchema.safeParse({
        ...validQuestion,
        options: ["", "b", "c", "d"],
      }).success,
    ).toBe(false);
  });

  it("correctIndex -1 fails", () => {
    expect(
      questionSchema.safeParse({ ...validQuestion, correctIndex: -1 }).success,
    ).toBe(false);
  });

  it("correctIndex 0 passes", () => {
    expect(
      questionSchema.safeParse({ ...validQuestion, correctIndex: 0 }).success,
    ).toBe(true);
  });

  it("correctIndex 3 passes", () => {
    expect(
      questionSchema.safeParse({ ...validQuestion, correctIndex: 3 }).success,
    ).toBe(true);
  });

  it("correctIndex 4 fails", () => {
    expect(
      questionSchema.safeParse({ ...validQuestion, correctIndex: 4 }).success,
    ).toBe(false);
  });

  it("correctIndex 1.5 fails", () => {
    expect(
      questionSchema.safeParse({ ...validQuestion, correctIndex: 1.5 }).success,
    ).toBe(false);
  });

  it("explanation len 1000 passes", () => {
    expect(
      questionSchema.safeParse({
        ...validQuestion,
        explanation: "a".repeat(1000),
      }).success,
    ).toBe(true);
  });

  it("explanation len 1001 fails", () => {
    expect(
      questionSchema.safeParse({
        ...validQuestion,
        explanation: "a".repeat(1001),
      }).success,
    ).toBe(false);
  });
});

describe("attemptBodySchema", () => {
  it('{ answersJson: "[0,1,2]" } passes', () => {
    expect(
      attemptBodySchema.safeParse({ answersJson: "[0,1,2]" }).success,
    ).toBe(true);
  });

  it("{} fails", () => {
    expect(attemptBodySchema.safeParse({}).success).toBe(false);
  });

  it("{ answersJson: 123 } fails", () => {
    expect(attemptBodySchema.safeParse({ answersJson: 123 }).success).toBe(
      false,
    );
  });
});

describe("answersSchema", () => {
  it("[0,3,2,1] passes", () => {
    expect(answersSchema.safeParse([0, 3, 2, 1]).success).toBe(true);
  });

  it("[] passes", () => {
    expect(answersSchema.safeParse([]).success).toBe(true);
  });

  it("[-1] fails", () => {
    expect(answersSchema.safeParse([-1]).success).toBe(false);
  });

  it("[4] fails", () => {
    expect(answersSchema.safeParse([4]).success).toBe(false);
  });

  it("[0.5] fails", () => {
    expect(answersSchema.safeParse([0.5]).success).toBe(false);
  });

  it('["1"] fails', () => {
    expect(answersSchema.safeParse(["1"]).success).toBe(false);
  });

  it("composition .length(2): [0] fails", () => {
    expect(answersSchema.length(2).safeParse([0]).success).toBe(false);
  });

  it("composition .length(2): [0,1] passes", () => {
    expect(answersSchema.length(2).safeParse([0, 1]).success).toBe(true);
  });
});

describe("MAX_QUESTIONS_PER_QUIZ", () => {
  it("equals 50", () => {
    expect(MAX_QUESTIONS_PER_QUIZ).toBe(50);
  });
});

describe("updateQuizSchema", () => {
  it("{} fails (refine: no fields)", () => {
    expect(updateQuizSchema.safeParse({}).success).toBe(false);
  });

  it("{title: undefined} fails (explicit-undefined trap)", () => {
    expect(updateQuizSchema.safeParse({ title: undefined }).success).toBe(
      false,
    );
  });

  it("{unknownKey: 1} fails (stripped → empty)", () => {
    expect(updateQuizSchema.safeParse({ unknownKey: 1 }).success).toBe(false);
  });

  it("{isPublished: true} alone passes", () => {
    expect(updateQuizSchema.safeParse({ isPublished: true }).success).toBe(
      true,
    );
  });

  it('{title: "ab"} fails (inherited min-3 rule)', () => {
    expect(updateQuizSchema.safeParse({ title: "ab" }).success).toBe(false);
  });

  it('"  New title  " trims', () => {
    const result = updateQuizSchema.safeParse({ title: "  New title  " });
    expect(result.success && result.data.title).toBe("New title");
  });

  it("{timeLimit: null} passes", () => {
    expect(updateQuizSchema.safeParse({ timeLimit: null }).success).toBe(true);
  });

  it("{timeLimit: 0} fails", () => {
    expect(updateQuizSchema.safeParse({ timeLimit: 0 }).success).toBe(false);
  });

  it("full payload passes", () => {
    expect(
      updateQuizSchema.safeParse({
        title: "My quiz",
        description: "d",
        timeLimit: 300,
        randomize: false,
        isPublished: true,
      }).success,
    ).toBe(true);
  });
});

describe("idSchema", () => {
  it('"" fails', () => {
    expect(idSchema.safeParse("").success).toBe(false);
  });

  it('"abc" passes', () => {
    expect(idSchema.safeParse("abc").success).toBe(true);
  });
});
