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

// Formatting is paid only (ADR 0035): the plan is set with the Admin SDK, as
// the webhook would.
async function signUpPaid(page: Page) {
  const uid = await signUp(page);
  await db.doc(`customers/${uid}`).set({ plan: "paid" }, { merge: true });
  return uid;
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
  return { title: meta.get("title"), doc: content.get("doc") as string };
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
  const uid = await signUpPaid(page);
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
  await signUpPaid(page);
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

test("leaving and opening a document again shows the latest text", async ({
  page,
}) => {
  const uid = await signUp(page);
  const id = await openNew(page, "New document");
  await page.keyboard.type("Body words");
  await title(page).fill("Return trip");
  await page.getByRole("link", { name: "Back to documents" }).click();
  await expect(page).toHaveURL("/documents");
  await page.getByRole("link", { name: "Return trip" }).click();
  await expect(page).toHaveURL(`/documents/${id}`);

  await expect(body(page)).toHaveText("Body words");
  await expect(title(page)).toHaveValue("Return trip");
  await body(page).press("End");
  await page.keyboard.type(" and more");
  await expect(saved(page, "Saved")).toBeVisible({ timeout: 10_000 });
  expect((await serverCopy(uid, id)).doc).toContain("Body words and more");
});

// Slice 4: the link editor (DESIGN.md §3 link editor, 2026-10-21).
const linkEditor = (page: Page) => page.getByRole("dialog", { name: "Link" });
const address = (page: Page) =>
  linkEditor(page).getByRole("textbox", { name: "Link address" });

test("⌘K links the selection, and the link is saved", async ({ page }) => {
  const uid = await signUpPaid(page);
  const id = await openNew(page, "New document");
  await page.keyboard.type("Read the brief");
  for (let i = 0; i < 5; i++) await page.keyboard.press("Shift+ArrowLeft");
  await page.keyboard.press("ControlOrMeta+k");
  await expect(address(page)).toBeFocused();
  await noSidewaysScroll(page);
  await address(page).fill("studio.co/q4");
  await address(page).press("Enter");

  await expect(linkEditor(page)).toBeHidden();
  const link = body(page).locator("a");
  await expect(link).toHaveText("brief");
  await expect(link).toHaveAttribute("href", "https://studio.co/q4");
  await expect(body(page)).toBeFocused();
  await expect(toggle(page, "Link")).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(async () => (await serverCopy(uid, id)).doc)
    .toContain("https://studio.co/q4");
});

test("the Link button edits a link and removes it", async ({ page }) => {
  await signUpPaid(page);
  await openNew(page, "New document");
  await page.keyboard.type("See ");
  await page.keyboard.press("ControlOrMeta+k");
  await address(page).fill("example.com");
  await address(page).press("Enter");
  const link = body(page).locator("a");
  await expect(link).toHaveText("example.com");
  await expect(link).toHaveAttribute("href", "https://example.com");

  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await toggle(page, "Link").click();
  await expect(address(page)).toHaveValue("https://example.com");
  await address(page).fill("https://studio.co");
  await linkEditor(page).getByRole("button", { name: "Apply" }).click();
  await expect(link).toHaveAttribute("href", "https://studio.co");
  await expect(link).toHaveText("example.com");

  await toggle(page, "Link").click();
  await linkEditor(page).getByRole("button", { name: "Remove link" }).click();
  await expect(body(page).locator("a")).toHaveCount(0);
  await expect(body(page)).toHaveText("See example.com");
});

test("a bad address stays open as invalid; Esc closes without a link", async ({
  page,
}) => {
  await signUpPaid(page);
  await openNew(page, "New document");
  await page.keyboard.type("Notes");
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("ControlOrMeta+k");
  await address(page).fill("hello world");
  await address(page).press("Enter");
  await expect(address(page)).toHaveAttribute("aria-invalid", "true");
  await page.keyboard.press("Escape");
  await expect(linkEditor(page)).toBeHidden();
  await expect(body(page)).toBeFocused();
  await expect(body(page).locator("a")).toHaveCount(0);
});

// Slice 4: the document menu (DESIGN.md app screens, 2026-10-21).
test("the document menu deletes the document after asking", async ({
  page,
}) => {
  const uid = await signUp(page);
  const id = await openNew(page, "New document");
  await title(page).fill("Q4 plan");
  await title(page).press("Enter");
  await expect(body(page)).toBeFocused();
  await page.keyboard.type("Draft");

  await page.getByRole("button", { name: "Document menu" }).click();
  const menu = page.getByRole("menu");
  await expect(menu.getByText("Export · paid plans")).toBeVisible();
  await expect(
    menu.getByRole("menuitem", { name: "PDF", exact: true }),
  ).toHaveAttribute("aria-disabled", "true");
  await noSidewaysScroll(page);
  await menu.getByRole("menuitem", { name: "Delete document" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Delete “Q4 plan”?" });
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await dialog.getByRole("button", { name: "Delete" }).click();

  await expect(page).toHaveURL("/documents");
  await expect(page.getByText("Document deleted")).toBeVisible();
  await expect(page.getByText("No documents yet")).toBeVisible();
  await expect
    .poll(
      async () => (await db.doc(`users/${uid}/documents/${id}`).get()).exists,
    )
    .toBe(false);
  // Nothing left waiting in autosave brings it back.
  await page.waitForTimeout(1500);
  expect((await db.doc(`users/${uid}/documents/${id}`).get()).exists).toBe(
    false,
  );
});

// Free plan is plain text (ADR 0035): the toolbar is locked, says to
// upgrade and goes to the plans page; shortcuts and "# " don't format.
test("on the Free plan the toolbar is locked and leads to the plans page", async ({
  page,
}) => {
  const uid = await signUp(page);
  const id = await openNew(page, "New document");
  await page.keyboard.type("# Plain words");
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("ControlOrMeta+b");
  await page.keyboard.press("ControlOrMeta+Alt+1");
  await expect(body(page).locator("h1, strong")).toHaveCount(0);
  await expect(saved(page, "Saved")).toBeVisible({ timeout: 10_000 });
  const { doc } = await serverCopy(uid, id);
  expect(doc).toContain("# Plain words");
  expect(doc).not.toMatch(/heading|bold/);

  await expect(toggle(page, "Bold")).toHaveAttribute("aria-disabled", "true");
  await toggle(page, "Bold").hover();
  await expect(
    page
      .getByRole("tooltip")
      .filter({ hasText: "Upgrade to unlock formatting" }),
  ).toBeVisible();
  // Playwright won't click an aria-disabled button on its own; people can.
  await toggle(page, "Text size").click({ force: true });
  await expect(page).toHaveURL("/plans");
});
