import { expect, test, type Page } from "@playwright/test";

// Writing font end to end (ADR 0010, 0031): chosen in Account → Writing,
// kept per user, applied to the body text of every document; the title and
// the interface stay in Geist.
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
const fontOf = (page: Page, name: "Title" | "Document body") =>
  page
    .getByRole("textbox", { name })
    .evaluate((el) => getComputedStyle(el).fontFamily);

test("the writing font is chosen in Account and used in documents", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "New document", exact: true }).click();
  await expect(body(page)).toBeVisible();
  expect(await fontOf(page, "Document body")).not.toMatch(/Plex/i);

  await page.goto("/account");
  const writing = page.getByRole("region", { name: "Writing" });
  await expect(writing.getByText("Geist")).toBeVisible();
  await writing.getByRole("button", { name: "Change" }).click();
  await page.getByRole("menuitemradio", { name: "IBM Plex Serif" }).click();
  await expect(writing.getByText("IBM Plex Serif")).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("region", { name: "Writing" }).getByText("IBM Plex Serif"),
  ).toBeVisible();

  await page.goto("/documents");
  await page.getByRole("link", { name: /Untitled/ }).click();
  await expect(body(page)).toBeVisible();
  await expect.poll(() => fontOf(page, "Document body")).toMatch(/Plex/i);
  expect(await fontOf(page, "Title")).not.toMatch(/Plex/i);
});
