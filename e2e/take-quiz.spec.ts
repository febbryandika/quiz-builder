import { expect, test } from "@playwright/test";
import { E2E_QUIZ, E2E_SHARE_CODE } from "./fixtures";

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

  test("invalid shareCode → not-found screen", async ({ page }) => {
    await page.goto("/q/does-not-exist");

    await expect(
      page.getByRole("heading", { name: "Quiz not found" }),
    ).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
  });
});
