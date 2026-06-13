// Deterministic seed data for the public quiz-player E2E. Shared by the seed
// (global-setup), cleanup (global-teardown), and the spec so assertions can rely
// on fixed questions, correct answers, and a known score. randomize is off and
// the answers below produce 2/3 correct.

export const E2E_USER_ID = "e2e-user";
export const E2E_SHARE_CODE = "e2eplayer01";

export type E2EQuestion = {
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string | null;
};

export const E2E_QUIZ = {
  title: "E2E Sample Quiz",
  description: "Seeded quiz for end-to-end player tests.",
  randomize: false,
  timeLimit: null,
  questions: [
    {
      prompt: "2 + 2 = ?",
      options: ["3", "4", "5", "6"],
      correctIndex: 1,
      explanation: "Basic arithmetic: 2 + 2 = 4.",
    },
    {
      prompt: "Capital of France?",
      options: ["Berlin", "Madrid", "Paris", "Rome"],
      correctIndex: 2,
      explanation: null,
    },
    {
      prompt: "Largest planet in the Solar System?",
      options: ["Earth", "Jupiter", "Mars", "Venus"],
      correctIndex: 1,
      explanation: null,
    },
  ] satisfies E2EQuestion[],
};
