import { expect, type Page } from "@playwright/test";

// Tests authenticate through the real /register UI (email+password is enabled and
// no email verification is enforced; sign-up auto-signs-in and lands on
// /dashboard). The email prefix lets global-teardown clean up created users.
export const E2E_USER_EMAIL_PREFIX = "e2e-test-";
export const E2E_USER_PASSWORD = "e2e-password-123"; // ≥8 chars (registerSchema)

// Registers a unique user and resolves once authenticated on /dashboard.
export async function signUpNewUser(page: Page): Promise<{ email: string }> {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const email = `${E2E_USER_EMAIL_PREFIX}${unique}@example.test`;

  await page.goto("/register");
  await page.locator("#name").fill(`E2E User ${unique}`);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(E2E_USER_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  return { email };
}
