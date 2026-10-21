import { expect, test, type Page } from "@playwright/test";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Phase 4 slice 3 end to end on the emulators (ADR 0006, 0024, 0028, 0029):
// the editor at /documents/[id] with title, formatting by toolbar and
// keyboard, autosave with the Saved indicator, offline edits, read-only after
// a downgrade.
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

async function openNew(page: Page, button: "New" | "New document") {
  await page.getByRole("button", { name: button, exact: true }).click();
  await expect(page).toHaveURL(/\/documents\/[A-Za-z0-9]{20}$/);
  await expect(body(page)).toBeVisible();
  return new URL(page.url()).pathname.split("/").pop()!;
}

const title = (page: Page) => page.getByRole("textbox", { name: "Title" });
const body = (page: Page) =>
  page.getByRole("textbox", { name: "Document body" });
const toggle = (page: Page, name: string) =>
  page.getByRole("toolbar", { name: "Formatting" }).getByRole("button", {
    name,
  });
const saved = (page: Page, text: string) =>
  page.getByTestId("saved-state").filter({ hasText: new RegExp(`^${text}$`) });

const serverCopy = async (uid: string, id: string) => {
  const [meta, content] = await Promise.all([
    db.doc(`users/${uid}/documents/${id}`).get(),
    db.doc(`users/${uid}/documents/${id}/content/current`).get(),
  ]);
  return { title: meta.get("title"), doc: JSON.stringify(content.get("doc")) };
};

async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test("writing with formatting saves and comes back after a reload", async ({
  page,
}) => {
  const uid = await signUp(page);
  const id = await openNew(page, "New document");
  await expect(title(page)).toHaveAttribute("placeholder", "Untitled");
  await expect(body(page)).toBeFocused();
  await noSidewaysScroll(page);

  await title(page).fill("Q4 plan");
  await title(page).press("Enter");
  await expect(body(page)).toBeFocused();
  await page.keyboard.press("ControlOrMeta+Alt+1");
  await page.keyboard.type("Goals");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Ship the ");
  await page.keyboard.press("ControlOrMeta+b");
  await page.keyboard.type("editor");
  await page.keyboard.press("ControlOrMeta+b");
  await page.keyboard.press("Enter");
  await page.keyboard.press("ControlOrMeta+Shift+8");
  await page.keyboard.type("autosave");

  await expect(toggle(page, "Bulleted list")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(saved(page, "Saved")).toBeVisible({ timeout: 10_000 });
  await expect
    .poll(() => serverCopy(uid, id))
    .toMatchObject({ title: "Q4 plan" });
  const { doc } = await serverCopy(uid, id);
  expect(doc).toContain('"heading"');
  expect(doc).toContain('"bold"');
  expect(doc).toContain('"bulletList"');

  await page.reload();
  await expect(title(page)).toHaveValue("Q4 plan");
  await expect(body(page).locator("h1")).toHaveText("Goals");
  await expect(body(page).locator("strong")).toHaveText("editor");
  await expect(body(page).locator("ul li")).toHaveText("autosave");
});

test("the toolbar formats the selection", async ({ page }) => {
  await signUp(page);
  await openNew(page, "New document");
  await page.keyboard.type("Quote me");
  await page.keyboard.press("ControlOrMeta+a");
  await toggle(page, "Italic").click();
  await expect(toggle(page, "Italic")).toHaveAttribute("aria-pressed", "true");
  await toggle(page, "Quote").click();
  await expect(body(page).locator("blockquote em")).toHaveText("Quote me");
  await toggle(page, "Undo").click();
  await expect(body(page).locator("blockquote")).toHaveCount(0);
});

test("edits made offline read Saved on device, then Saved once back", async ({
  page,
}) => {
  const uid = await signUp(page);
  const id = await openNew(page, "New document");
  await page.route(firestoreTraffic, (route) => route.abort());
  await page.keyboard.type("Written on a train");
  await expect(saved(page, "Saved on device")).toBeVisible({ timeout: 10_000 });

  await page.unroute(firestoreTraffic);
  await expect(saved(page, "Saved")).toBeVisible({ timeout: 30_000 });
  expect((await serverCopy(uid, id)).doc).toContain("Written on a train");
});

test("Back returns to the list with the new title", async ({ page }) => {
  await signUp(page);
  await openNew(page, "New document");
  await title(page).fill("Board update");
  await page.getByRole("link", { name: "Back to documents" }).click();
  await expect(page).toHaveURL("/documents");
  await expect(
    page.getByRole("listitem").filter({ hasText: "Board update" }),
  ).toBeVisible();
});

test("after a downgrade an older document opens read-only", async ({
  page,
}) => {
  const uid = await signUp(page);
  await db.doc(`customers/${uid}`).set({ plan: "paid" }, { merge: true });
  const older = await openNew(page, "New document");
  await page.keyboard.type("Old words");
  await expect(saved(page, "Saved")).toBeVisible({ timeout: 10_000 });
  await page.goto("/documents");
  await openNew(page, "New");
  await db.doc(`customers/${uid}`).set({ plan: "free" }, { merge: true });

  await page.goto(`/documents/${older}`);
  await expect(body(page)).toHaveText("Old words");
  await expect(page.getByText("Read-only", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Resubscribe" })).toHaveAttribute(
    "href",
    "/plans",
  );
  await expect(body(page)).toHaveAttribute("contenteditable", "false");
  await expect(title(page)).toHaveAttribute("readonly", "");
  await expect(toggle(page, "Bold")).toBeDisabled();
  await noSidewaysScroll(page);
});

test("a document that doesn't exist shows not found", async ({ page }) => {
  await signUp(page);
  await page.goto("/documents/aaaaaaaaaaaaaaaaaaaa");
  await expect(page.getByText("Document not found")).toBeVisible();
  await page.getByRole("link", { name: "Back to documents" }).click();
  await expect(page).toHaveURL("/documents");
});

test("after going back from the editor, New is ready again", async ({
  page,
}) => {
  await signUp(page);
  await openNew(page, "New document");
  await page.getByRole("link", { name: "Back to documents" }).click();
  await expect(page).toHaveURL("/documents");
  const button = page.getByRole("button", { name: "New", exact: true });
  await expect(button).toBeEnabled();
  await expect(button).not.toHaveAttribute("aria-busy");
});

test("the Saved indicator sits quietly in the bottom-right corner", async ({
  page,
}) => {
  await signUp(page);
  await openNew(page, "New document");
  const indicator = saved(page, "Saved");
  await expect(indicator).toBeVisible();
  const box = (await indicator.boundingBox())!;
  const view = page.viewportSize()!;
  const edge = view.width < 640 ? 16 : 24;
  expect(Math.round(view.width - (box.x + box.width))).toBe(edge);
  expect(view.height - (box.y + box.height)).toBeLessThanOrEqual(edge + 8);
  await expect(page.locator("header").getByTestId("saved-state")).toHaveCount(
    0,
  );
});
