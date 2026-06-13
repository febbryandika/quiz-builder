// Deterministic seed data for the public quiz-player E2E. Shared by the seed
// (global-setup), cleanup (global-teardown), and the spec so assertions can rely
// on fixed questions, correct answers, and a known score. randomize is off and
// the answers below produce 2/3 correct.

export const E2E_USER_ID = "e2e-user";
export const E2E_SHARE_CODE = "e2eplayer01";
// A second published quiz with a 1s time limit, used to verify that a failed
// auto-submit on timer expiry does NOT loop into repeated resubmissions.
export const E2E_TIMED_SHARE_CODE = "e2etimed001";

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

// Same questions as E2E_QUIZ but with a short countdown so the player
// auto-submits on its own. Used by the timed-loop regression test.
export const E2E_TIMED_QUIZ = {
  title: "E2E Timed Quiz",
  description: "Seeded timed quiz for the auto-submit loop regression test.",
  randomize: false,
  timeLimit: 1,
  questions: E2E_QUIZ.questions,
};
