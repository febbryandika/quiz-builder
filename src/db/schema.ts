import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { nanoid } from "nanoid";

export const quizzes = pgTable(
  "quizzes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id").notNull(), // references Better Auth user
    title: text("title").notNull(),
    description: text("description"),
    timeLimit: integer("time_limit"),
    randomize: boolean("randomize").notNull().default(false),
    isPublished: boolean("is_published").notNull().default(false),
    shareCode: text("share_code")
      .notNull()
      .unique()
      .$defaultFn(() => nanoid(10)),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("idx_quiz_user").on(t.userId),
    index("idx_quiz_share").on(t.shareCode),
  ],
);

export const questions = pgTable(
  "questions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    quizId: text("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    optionsJson: text("options_json").notNull(), // JSON string[]
    correctIndex: integer("correct_index").notNull(),
    explanation: text("explanation"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("idx_question_quiz").on(t.quizId)],
);

export const attempts = pgTable(
  "attempts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    quizId: text("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    answersJson: text("answers_json").notNull(), // JSON: number[] (selected index per question)
    score: integer("score").notNull(),
    total: integer("total").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
  },
  (t) => [index("idx_attempt_quiz").on(t.quizId)],
);

export * from "./auth-schema";
