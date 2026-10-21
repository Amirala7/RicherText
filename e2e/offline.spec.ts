import { expect, test, type Page } from "@playwright/test";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Offline cache end to end on the emulators (ADR 0029): Firestore keeps data
// and queued writes in IndexedDB, so an edit made while the server can't be
// reached survives a reload and lands later; sign out deletes the cache.
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
const admin = getApps()[0] ?? initializeApp({ projectId: "demo-richertext" });
const db = getFirestore(admin);
const firestoreTraffic = "http://127.0.0.1:8080/**";

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

async function createDocument(page: Page) {
  await page.getByRole("button", { name: "New document" }).click();
  await expect(page).toHaveURL(/\/documents\/[A-Za-z0-9]{20}$/);
  const id = new URL(page.url()).pathname.split("/").pop()!;
  await page.goto("/documents");
  return id;
}

const row = (page: Page, title: string) =>
  page.getByRole("listitem").filter({ hasText: title });

const firestoreDatabases = (page: Page) =>
  page.evaluate(async () =>
    (await indexedDB.databases())
      .map((d) => d.name ?? "")
      .filter((name) => name.startsWith("firestore/")),
  );

test("a rename made without a connection survives a reload and syncs later", async ({
  page,
}) => {
  const uid = await signUp(page);
  const id = await createDocument(page);
  await expect(row(page, "Untitled")).toBeVisible();

  await page.route(firestoreTraffic, (route) => route.abort());
  await page
    .getByRole("listitem")
    .filter({ hasText: "Untitled" })
    .getByRole("button", { name: "Document actions" })
    .click();
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await page.getByRole("textbox", { name: "Title" }).fill("Written offline");
  await page.keyboard.press("Enter");
  await expect(row(page, "Written offline")).toBeVisible();

  await page.reload();
  await expect(row(page, "Written offline")).toBeVisible();
  const ref = db.doc(`users/${uid}/documents/${id}`);
  expect((await ref.get()).get("title")).toBe("");

  await page.unroute(firestoreTraffic);
  await expect
    .poll(async () => (await ref.get()).get("title"), { timeout: 30_000 })
    .toBe("Written offline");
});

test("signing out deletes the documents cached on the device", async ({
  page,
}) => {
  await signUp(page);
  await createDocument(page);
  await expect(row(page, "Untitled")).toBeVisible();
  expect(await firestoreDatabases(page)).not.toEqual([]);

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/sign-in");
  await expect.poll(() => firestoreDatabases(page)).toEqual([]);
});
