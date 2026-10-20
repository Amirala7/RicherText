import { expect, test } from "@playwright/test";

// The browser console never shows a token or personal data (user, 2026-10-21).
const jwt = /eyJ[\w-]{8,}\.[\w-]{8,}\./;

test("signing up, in and out prints no email, password or token", async ({
  page,
}) => {
  const email = `console-${crypto.randomUUID()}@example.com`;
  const password = "secret-password-123";
  const printed: string[] = [];
  page.on("console", (m) => printed.push(m.text()));
  page.on("pageerror", (e) => printed.push(e.message));

  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/documents");
  await page.reload();

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/sign-in");

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("wrong-password-1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByText(
      "That email and password don't match. Try again or reset your password.",
    ),
  ).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/documents");

  const all = printed.join("\n");
  expect(all).not.toContain(email);
  expect(all).not.toContain(password);
  expect(all).not.toContain("wrong-password-1");
  expect(all).not.toMatch(jwt);
});
