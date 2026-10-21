import { expect, test, type Page } from "@playwright/test";
import { googleDocs, word } from "../src/lib/editor/__fixtures__/clipboard";

// Paste fidelity end to end (CONTEXT §5, ADR 0030 slice 4): a real paste
// event in the browser goes through the paste clean-up, and the result is
// saved. The app-by-app shapes are covered in src/lib/editor/paste.test.ts.
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
const saved = (page: Page) =>
  page.getByTestId("saved-state").filter({ hasText: /^Saved$/ });

async function pasteHtml(page: Page, html: string) {
  await body(page).evaluate((el, html) => {
    const data = new DataTransfer();
    data.setData("text/html", html);
    data.setData("text/plain", el.textContent ?? "");
    el.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, html);
}

test("a Word list pastes as a real nested list and is saved", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "New document", exact: true }).click();
  await expect(body(page)).toBeVisible();
  await body(page).click();
  await pasteHtml(page, word);

  await expect(body(page).locator("h1")).toHaveText("Q4 plan");
  await expect(body(page).locator("ul > li > ul > li")).toHaveText("Nested");
  await expect(body(page).locator("ol > li")).toHaveText(["One", "Two"]);
  await expect(body(page).locator("blockquote")).toHaveText("Quoted");
  await expect(body(page)).not.toContainText("·");
  await expect(saved(page)).toBeVisible();

  await page.reload();
  await expect(body(page).locator("ul > li > ul > li")).toHaveText("Nested");
  await expect(body(page).locator("blockquote")).toHaveText("Quoted");
});

test("a Google Docs link pastes as a link without an extra underline", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "New document", exact: true }).click();
  await expect(body(page)).toBeVisible();
  await body(page).click();
  await pasteHtml(page, googleDocs);

  const link = body(page).getByRole("link", { name: "a link" });
  await expect(link).toHaveAttribute("href", "https://example.com/");
  await expect(link.locator("u")).toHaveCount(0);
  await expect(body(page).locator("strong")).toHaveText("bold");
  await expect(body(page).locator("[style]")).toHaveCount(0);
});
