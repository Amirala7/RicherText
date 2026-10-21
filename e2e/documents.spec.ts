import { expect, test, type Page } from "@playwright/test";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Phase 4 slice 2 end to end on the emulators (ADR 0024, 0028): the document
// list with create, rename, delete, filter, the Free limit (→ /plans) and the
// read-only rule after a downgrade. The plan is played by writing with the
// Admin SDK, as the webhook would.
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

const setPlan = (uid: string, plan: "paid" | "free") =>
  db.doc(`customers/${uid}`).set({ plan }, { merge: true });

// New opens the document; the list is one step back.
async function createFromList(page: Page, button: "New" | "New document") {
  await page.getByRole("button", { name: button, exact: true }).click();
  await expect(page).toHaveURL(/\/documents\/[A-Za-z0-9]{20}$/);
  const id = new URL(page.url()).pathname.split("/").pop()!;
  await page.goto("/documents");
  return id;
}

const row = (page: Page, title: string) =>
  page.getByRole("listitem").filter({ hasText: title });

async function openMenu(page: Page, title: string) {
  await row(page, title)
    .getByRole("button", { name: "Document actions" })
    .click();
}

async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test("a Free user creates, renames and deletes their document", async ({
  page,
}) => {
  const uid = await signUp(page);
  await expect(page.getByText("No documents yet")).toBeVisible();

  const id = await createFromList(page, "New document");
  await expect(row(page, "Untitled")).toContainText("just now");
  await noSidewaysScroll(page);

  await openMenu(page, "Untitled");
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await page.getByRole("textbox", { name: "Title" }).fill("Q4 plan");
  await page.keyboard.press("Enter");
  await expect(row(page, "Q4 plan")).toBeVisible();
  // The device cache keeps the rename across an immediate reload (ADR 0029);
  // then the server gets it too.
  await page.reload();
  await expect(row(page, "Q4 plan")).toBeVisible();
  await expect
    .poll(async () =>
      (await db.doc(`users/${uid}/documents/${id}`).get()).get("title"),
    )
    .toBe("Q4 plan");

  await openMenu(page, "Q4 plan");
  await page.getByRole("menuitem", { name: "Delete" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Delete “Q4 plan”?" });
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await dialog.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Document deleted")).toBeVisible();
  await expect(page.getByText("No documents yet")).toBeVisible();
});

test("a Free user with a document is sent to the plans page by New", async ({
  page,
}) => {
  await signUp(page);
  await createFromList(page, "New document");
  await page.getByRole("button", { name: "New", exact: true }).click();
  await expect(page).toHaveURL("/plans");
});

test("a paid user keeps several documents and filters them", async ({
  page,
}) => {
  const uid = await signUp(page);
  await setPlan(uid, "paid");
  await createFromList(page, "New document");
  await openMenu(page, "Untitled");
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await page.getByRole("textbox", { name: "Title" }).fill("Meeting notes");
  await page.keyboard.press("Enter");
  await expect(row(page, "Meeting notes")).toBeVisible();
  await createFromList(page, "New");

  await expect(page.getByRole("listitem")).toHaveCount(2);
  await page.getByRole("searchbox", { name: "Filter documents" }).fill("meet");
  await expect(page.getByRole("listitem")).toHaveCount(1);
  await expect(row(page, "Meeting notes")).toBeVisible();
  await noSidewaysScroll(page);
});

test("after a downgrade only the newest document can be renamed", async ({
  page,
}) => {
  const uid = await signUp(page);
  await setPlan(uid, "paid");
  await createFromList(page, "New document");
  await openMenu(page, "Untitled");
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await page.getByRole("textbox", { name: "Title" }).fill("Older");
  await page.keyboard.press("Enter");
  await expect(row(page, "Older")).toBeVisible();
  await createFromList(page, "New");
  await setPlan(uid, "free");

  await openMenu(page, "Older");
  await expect(page.getByRole("menuitem", { name: "Delete" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Rename" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await openMenu(page, "Untitled");
  await expect(page.getByRole("menuitem", { name: "Rename" })).toBeVisible();
});

test("Rename puts the cursor in the title; Esc cancels, Enter saves", async ({
  page,
}) => {
  await signUp(page);
  await createFromList(page, "New document");

  await openMenu(page, "Untitled");
  await page.getByRole("menuitem", { name: "Rename" }).click();
  const title = page.getByRole("textbox", { name: "Title" });
  await expect(title).toBeFocused();
  await page.keyboard.type("Draft");
  await page.keyboard.press("Escape");
  await expect(title).toHaveCount(0);
  await expect(row(page, "Untitled")).toBeVisible();

  await openMenu(page, "Untitled");
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await expect(title).toBeFocused();
  await page.keyboard.type("Draft");
  await page.keyboard.press("Enter");
  await expect(row(page, "Draft")).toBeVisible();
});
