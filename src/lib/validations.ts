import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

// min/max mirror Better Auth's server-side password policy (8–128)
export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
});

// Cap enforced at add-question time (count check), not inside questionSchema
export const MAX_QUESTIONS_PER_QUIZ = 50;

export const quizSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be at most 100 characters"),
  description: z
    .string()
    .trim()
    .max(1000, "Description must be at most 1000 characters")
    .optional(),
  // seconds; null = no time limit (SPEC §3.1)
  timeLimit: z.int().min(1, "Time limit must be at least 1 second").nullable(),
  randomize: z.boolean(),
});

export const questionSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, "Prompt is required")
    .max(500, "Prompt must be at most 500 characters"),
  options: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Option text is required")
        .max(200, "Each option must be at most 200 characters"),
    )
    .length(4, "Exactly 4 options are required"),
  correctIndex: z
    .int()
    .min(0, "Correct answer must be one of the 4 options")
    .max(3, "Correct answer must be one of the 4 options"),
  explanation: z
    .string()
    .trim()
    .max(1000, "Explanation must be at most 1000 characters")
    .optional(),
});

// SPEC §5.3 attempt body, centralized per §8
export const attemptBodySchema = z.object({
  answersJson: z.string("answersJson required"),
});

// Parsed answersJson; length-match vs question count composed at the route:
//   answersSchema.length(quiz.questions.length)
export const answersSchema = z.array(
  z.int().min(0, "Invalid answer index").max(3, "Invalid answer index"),
);

// Partial update incl. publish toggle (SPEC §3.1) — publish/unpublish goes
// through updateQuiz; SPEC §5.2 defines no separate publish action.
// Refine rejects no-op patches ({} or all-undefined): drizzle .set() throws on empty.
export const updateQuizSchema = quizSchema
  .extend({ isPublished: z.boolean() })
  .partial()
  .refine((fields) => Object.values(fields).some((v) => v !== undefined), {
    message: "At least one field must be provided",
  });

// cuid2 ids; presence check only — actions are network endpoints (SPEC §7)
export const idSchema = z.string().min(1, "id is required");

// Mirrors updateQuizSchema: partial patch, reject no-op ({}/all-undefined)
export const updateQuestionSchema = questionSchema
  .partial()
  .refine((fields) => Object.values(fields).some((v) => v !== undefined), {
    message: "At least one field must be provided",
  });

// Full new order for one quiz; set-equality vs DB checked in the action
export const reorderQuestionsSchema = z.object({
  quizId: idSchema,
  questionIds: z.array(idSchema).min(1, "questionIds must not be empty"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type QuizInput = z.infer<typeof quizSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
export type AttemptBodyInput = z.infer<typeof attemptBodySchema>;
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type ReorderQuestionsInput = z.infer<typeof reorderQuestionsSchema>;
