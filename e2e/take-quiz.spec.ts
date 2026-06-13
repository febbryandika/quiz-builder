import { expect, test, type Page } from "@playwright/test";
import { E2E_QUIZ, E2E_SHARE_CODE, E2E_TIMED_SHARE_CODE } from "./fixtures";

// errorResponse wire shape (src/lib/api.ts) so apiFetch throws ApiError → the
// submit mutation's onError fires.
const ERROR_BODY = JSON.stringify({
  error: { code: "INTERNAL", message: "Something went wrong" },
});

// Intercept the attempt POST, counting calls. `failFirst` makes only call #1
// fail (then continue to the real server); otherwise every call fails.
async function interceptAttempt(
  page: Page,
  opts: { failFirst: boolean },
): Promise<() => number> {
  let calls = 0;
  await page.route("**/api/public/quiz/*/attempt", async (route) => {
    calls += 1;
    if (!opts.failFirst || calls === 1) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: ERROR_BODY,
      });
    } else {
      await route.continue();
    }
  });
  return () => calls;
}

test.describe("public quiz player", () => {
  test("take quiz one question at a time → server-scored results", async ({
    page,
  }) => {
    await page.goto(`/q/${E2E_SHARE_CODE}`);

    // Player initialized: title, progress text, and progress bar are present.
    await expect(
      page.getByRole("heading", { name: E2E_QUIZ.title }),
    ).toBeVisible();
    await expect(page.getByText("Question 1 of 3")).toBeVisible();
    await expect(page.getByRole("progressbar")).toBeVisible();

    // Q1 — correct answer ("4").
    await expect(page.getByText(E2E_QUIZ.questions[0].prompt)).toBeVisible();
    await page.getByRole("radio", { name: "4", exact: true }).check();
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Q2 — wrong answer ("Berlin"; correct is "Paris").
    await expect(page.getByText("Question 2 of 3")).toBeVisible();
    await page.getByRole("radio", { name: "Berlin", exact: true }).check();
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Q3 — correct ("Jupiter"). Last question shows Submit, not Next.
    await expect(page.getByText("Question 3 of 3")).toBeVisible();
    await page.getByRole("radio", { name: "Jupiter", exact: true }).check();
    await expect(page.getByRole("button", { name: "Next", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Submit", exact: true })).toBeVisible();

    // Answer preservation (Zustand): Back restores the Q2 selection.
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page.getByText("Question 2 of 3")).toBeVisible();
    await expect(
      page.getByRole("radio", { name: "Berlin", exact: true }),
    ).toBeChecked();
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Submit → server scores the attempt → results page.
    await page.getByRole("button", { name: "Submit", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/q/${E2E_SHARE_CODE}/done$`));

    // 2 of 3 correct (Q1 + Q3); Q2 wrong.
    await expect(
      page.getByRole("heading", { name: "You scored 2/3" }),
    ).toBeVisible();

    // Per-question badges: exactly two "Correct" and one "Incorrect".
    // (exact:true keeps the "Correct answer" reveal labels from matching.)
    await expect(page.getByText("Correct", { exact: true })).toHaveCount(2);
    await expect(page.getByText("Incorrect", { exact: true })).toHaveCount(1);

    // Reveal labels + the Q1 explanation are shown only after submission.
    await expect(page.getByText("Your answer")).toBeVisible();
    await expect(
      page.getByText(E2E_QUIZ.questions[0].explanation!),
    ).toBeVisible();
  });

  test("failed submission → Retry CTA preserves answers → succeeds on retry", async ({
    page,
  }) => {
    const callCount = await interceptAttempt(page, { failFirst: true });

    await page.goto(`/q/${E2E_SHARE_CODE}`);

    // Answer 2/3 correctly: Q1 "4" ✓, Q2 "Berlin" ✗, Q3 "Jupiter" ✓.
    await page.getByRole("radio", { name: "4", exact: true }).check();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("radio", { name: "Berlin", exact: true }).check();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("radio", { name: "Jupiter", exact: true }).check();

    // First submit fails → error alert + explicit Retry CTA; still on the quiz.
    await page.getByRole("button", { name: "Submit", exact: true }).click();
    await expect(page.getByText("Please try again")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Retry", exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/q/${E2E_SHARE_CODE}$`));

    // Retry submits the preserved answers → real scoring → results page.
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/q/${E2E_SHARE_CODE}/done$`));
    await expect(
      page.getByRole("heading", { name: "You scored 2/3" }),
    ).toBeVisible();

    expect(callCount()).toBe(2);
  });

  test("timed quiz: failed auto-submit does not loop (exactly one attempt)", async ({
    page,
  }) => {
    const callCount = await interceptAttempt(page, { failFirst: false });

    // 1s time limit → the player auto-submits on its own; every POST fails.
    await page.goto(`/q/${E2E_TIMED_SHARE_CODE}`);

    // Auto-submit fired and failed → Retry CTA is shown.
    await expect(
      page.getByRole("button", { name: "Retry", exact: true }),
    ).toBeVisible();

    // Give a buggy resubmit loop time to fire repeatedly, then assert it didn't:
    // exactly one attempt was made, and the timer never restarts a new submit.
    await page.waitForTimeout(2000);
    expect(callCount()).toBe(1);
  });

  test("invalid shareCode → not-found screen", async ({ page }) => {
    await page.goto("/q/does-not-exist");

    await expect(
      page.getByRole("heading", { name: "Quiz not found" }),
    ).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
  });
});
