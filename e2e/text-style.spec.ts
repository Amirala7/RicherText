import { expect, test, type Page } from "@playwright/test";

// Text size and colour end to end (ADR 0031): picked from the toolbar for
// the selection, saved in the document, shown in the light or dark shade.
async function signUp(page: Page) {
  const email = `e2e-${crypto.randomUUID()}@example.com`;
  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("correct horse");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/documents");
}

const body = (page: Page) =>
  page.getByRole("textbox", { name: "Document body" });
const toolbar = (page: Page) =>
  page.getByRole("toolbar", { name: "Formatting" });
const saved = (page: Page) =>
  page.getByTestId("saved-state").filter({ hasText: /^Saved$/ });

test("size and colour apply to the selection and are saved", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "New document", exact: true }).click();
  await expect(body(page)).toBeFocused();
  await page.keyboard.type("Make this red");
  await page.keyboard.press("Shift+ArrowLeft");
  await page.keyboard.press("Shift+ArrowLeft");
  await page.keyboard.press("Shift+ArrowLeft");

  await toolbar(page).getByRole("button", { name: "Text colour" }).click();
  await page.getByRole("menuitemradio", { name: "Red" }).click();
  await toolbar(page).getByRole("button", { name: "Text size" }).click();
  await page.getByRole("menuitemradio", { name: "Large" }).click();

  const red = body(page).locator('[data-color="red"]');
  await expect(red).toHaveText("red");
  await expect(body(page).locator('[data-size="large"]')).toHaveText("red");
  await expect(red).toHaveCSS("color", "rgb(194, 40, 38)");
  await expect(saved(page)).toBeVisible();

  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  await expect(red).toHaveText("red");
  await expect(red).toHaveCSS("color", "rgb(247, 133, 125)");
  await expect(body(page).locator('[data-size="large"]')).toHaveCSS(
    "font-size",
    "18px",
  );
});
