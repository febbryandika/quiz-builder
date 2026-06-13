import { expect, test } from "@playwright/test";
import { signUpNewUser } from "./auth";

// Full authenticated happy path (SPEC §10): sign up → create a quiz → add
// questions → publish → take it as the public player → see server-scored
// results. The share code is generated server-side, so the test reads it from
// the UI after publishing rather than assuming a value.
test.describe("authenticated quiz lifecycle", () => {
  test("create → add questions → publish → take → results", async ({
    page,
  }) => {
    await signUpNewUser(page); // lands on /dashboard

    // Create the quiz.
    await page.getByRole("link", { name: "New quiz" }).click();
    await expect(page).toHaveURL(/\/quizzes\/new$/);
    await page.locator("#title").fill("Lifecycle Quiz");
    await page.getByRole("button", { name: "Create quiz" }).click();

    // Redirected to the editor once the quiz exists.
    await expect(page).toHaveURL(/\/quizzes\/[^/]+\/edit$/);
    await expect(
      page.getByRole("heading", { name: "Lifecycle Quiz" }),
    ).toBeVisible();

    // Q1 — correct answer is option 2 ("4", index 1).
    await page.getByLabel("Prompt").fill("2 + 2 = ?");
    await page.getByLabel("Option 1").fill("3");
    await page.getByLabel("Option 2").fill("4");
    await page.getByLabel("Option 3").fill("5");
    await page.getByLabel("Option 4").fill("6");
    await page.locator('input[name="correctIndex"]').nth(1).check();
    await page.getByRole("button", { name: "Add question" }).click();
    await expect(page.getByText("2 + 2 = ?")).toBeVisible(); // appears in the list

    // Q2 — correct answer is option 3 ("Paris", index 2). The add form resets
    // on success, so refill the same fields.
    await page.getByLabel("Prompt").fill("Capital of France?");
    await page.getByLabel("Option 1").fill("Berlin");
    await page.getByLabel("Option 2").fill("Madrid");
    await page.getByLabel("Option 3").fill("Paris");
    await page.getByLabel("Option 4").fill("Rome");
    await page.locator('input[name="correctIndex"]').nth(2).check();
    await page.getByRole("button", { name: "Add question" }).click();
    await expect(page.getByText("Capital of France?")).toBeVisible();

    // Publish → the share link surfaces; read the server-generated share code.
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Published", { exact: true })).toBeVisible();
    const shareUrl = await page.getByLabel("Share link").inputValue();
    const shareCode = shareUrl.match(/\/q\/([^/]+)$/)?.[1];
    expect(shareCode).toBeTruthy();

    // Take the quiz as the public player: Q1 correct ("4"), Q2 wrong ("Berlin").
    await page.goto(`/q/${shareCode}`);
    await expect(
      page.getByRole("heading", { name: "Lifecycle Quiz" }),
    ).toBeVisible();
    await expect(page.getByText("Question 1 of 2")).toBeVisible();
    await page.getByRole("radio", { name: "4", exact: true }).check();
    await page.getByRole("button", { name: "Next", exact: true }).click();

    await expect(page.getByText("Question 2 of 2")).toBeVisible();
    await page.getByRole("radio", { name: "Berlin", exact: true }).check();
    await page.getByRole("button", { name: "Submit", exact: true }).click();

    // Server-scored results: 1/2, with one correct and one incorrect badge.
    await expect(page).toHaveURL(new RegExp(`/q/${shareCode}/done$`));
    await expect(
      page.getByRole("heading", { name: "You scored 1/2" }),
    ).toBeVisible();
    await expect(page.getByText("Correct", { exact: true })).toHaveCount(1);
    await expect(page.getByText("Incorrect", { exact: true })).toHaveCount(1);
  });
});
