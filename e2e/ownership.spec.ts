import { expect, test } from "@playwright/test";
import { signUpNewUser } from "./auth";
import { E2E_FOREIGN_QUIZ_ID } from "./fixtures";

// Ownership protection (SPEC §7/§10): a signed-up user cannot open the editor for
// a quiz they don't own. GET /api/quizzes/[id] returns 404 for a non-owner (it
// never distinguishes missing from unowned), so the editor renders its
// "Quiz not found" state rather than the editing chrome.
test.describe("ownership protection", () => {
  test("cannot open another user's quiz editor", async ({ page }) => {
    await signUpNewUser(page); // authenticated as a fresh user (not the owner)

    await page.goto(`/quizzes/${E2E_FOREIGN_QUIZ_ID}/edit`);

    await expect(page.getByText("Quiz not found")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Back to dashboard" }),
    ).toBeVisible();
    // The editor chrome never renders for a non-owner.
    await expect(
      page.getByRole("button", { name: "Publish" }),
    ).toHaveCount(0);
  });
});
