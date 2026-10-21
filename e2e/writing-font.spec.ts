import { expect, test, type Page } from "@playwright/test";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Writing font end to end (ADR 0032): picked in the editor toolbar, saved
// with that document only, applied to its body text; the title and the
// interface stay in Geist. Account has no Writing section. A paid plan (set
// with the Admin SDK, as the webhook would) allows a second document.
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
const admin = getApps()[0] ?? initializeApp({ projectId: "demo-richertext" });
const db = getFirestore(admin);

async function signUp(page: Page) {
  const email = `e2e-${crypto.randomUUID()}@example.com`;
  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("correct horse");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/documents");
  return (await getAuth(admin).getUserByEmail(email)).uid;
}

const body = (page: Page) =>
  page.getByRole("textbox", { name: "Document body" });
const fontOf = (page: Page, name: "Title" | "Document body") =>
  page
    .getByRole("textbox", { name })
    .evaluate((el) => getComputedStyle(el).fontFamily);
const saved = (page: Page) =>
  page.getByTestId("saved-state").filter({ hasText: /^Saved$/ });

async function newDocument(page: Page, button: "New" | "New document") {
  await page.goto("/documents");
  await page.getByRole("button", { name: button, exact: true }).click();
  await expect(page).toHaveURL(/\/documents\/[A-Za-z0-9]{20}$/);
  await expect(body(page)).toBeVisible();
}

test("the writing font is picked per document in the editor", async ({
  page,
}) => {
  const uid = await signUp(page);
  await db.doc(`customers/${uid}`).set({ plan: "paid" });
  await newDocument(page, "New document");
  const first = page.url();
  expect(await fontOf(page, "Document body")).not.toMatch(/Plex/i);

  await page
    .getByRole("toolbar", { name: "Formatting" })
    .getByRole("button", { name: "Writing font" })
    .click();
  await page.getByRole("menuitemradio", { name: "IBM Plex Serif" }).click();
  await expect.poll(() => fontOf(page, "Document body")).toMatch(/Plex/i);
  await expect(saved(page)).toBeVisible();

  await page.reload();
  await expect(body(page)).toBeVisible();
  await expect.poll(() => fontOf(page, "Document body")).toMatch(/Plex/i);
  expect(await fontOf(page, "Title")).not.toMatch(/Plex/i);

  await newDocument(page, "New");
  expect(page.url()).not.toBe(first);
  expect(await fontOf(page, "Document body")).not.toMatch(/Plex/i);

  await page.goto("/account");
  await expect(page.getByRole("region", { name: "Profile" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Writing" })).toHaveCount(0);
});
