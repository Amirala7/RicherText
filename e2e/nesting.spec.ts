import { expect, test, type Page } from "@playwright/test";

// A list indented three times hits Firestore's 20-level map limit unless the
// content is stored as a JSON string (ADR 0033): it must save and come back.
async function signUp(page: Page) {
  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(`e2e-${crypto.randomUUID()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("correct horse");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/documents");
}

const body = (page: Page) =>
  page.getByRole("textbox", { name: "Document body" });

test("a deeply indented list saves and comes back after a reload", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "New document", exact: true }).click();
  await expect(page).toHaveURL(/\/documents\/[A-Za-z0-9]{20}$/);
  await expect(body(page)).toBeFocused();

  await page.keyboard.type("- one");
  for (const word of ["two", "three", "four"]) {
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    await page.keyboard.type(word);
  }
  await expect(body(page).locator("ul ul ul ul")).toHaveText("four");
  await expect(
    page.getByTestId("saved-state").filter({ hasText: /^Saved$/ }),
  ).toBeVisible({ timeout: 10_000 });

  await page.reload();
  await expect(body(page).locator("ul ul ul ul")).toHaveText("four");
});
