import { expect, test, type Page } from "@playwright/test";

// Phase 2 slice 1 end to end on the Auth emulator (ADR 0026).
const password = "correct horse";

function newEmail() {
  return `e2e-${crypto.randomUUID()}@example.com`;
}

async function signUp(page: Page, email: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/documents");
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/sign-in");
}

test("a new account lands on the empty documents page", async ({ page }) => {
  const email = newEmail();
  await signUp(page, email);
  await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible();
  await expect(page.getByText("No documents yet")).toBeVisible();
  await page.getByRole("button", { name: "Account menu" }).click();
  await expect(page.getByRole("menu")).toContainText(email);
});

test("the session survives a reload", async ({ page }) => {
  await signUp(page, newEmail());
  await page.reload();
  await expect(page).toHaveURL("/documents");
});

test("the session cookie is httpOnly and same-site", async ({
  page,
  context,
}) => {
  await signUp(page, newEmail());
  const cookie = (await context.cookies()).find((c) => c.name === "__session");
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");
});

test("signing out ends the session", async ({ page }) => {
  await signUp(page, newEmail());
  await signOut(page);
  await page.goto("/documents");
  await expect(page).toHaveURL("/sign-in?next=%2Fdocuments");
});

test("signing in returns to the page asked for", async ({ page }) => {
  const email = newEmail();
  await signUp(page, email);
  await signOut(page);
  await page.goto("/account");
  await expect(page).toHaveURL("/sign-in?next=%2Faccount");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/account");
});

test("signing in ignores a next that leaves the site", async ({ page }) => {
  const email = newEmail();
  await signUp(page, email);
  await signOut(page);
  await page.goto("/sign-in?next=https://evil.example");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/documents");
});

test("a wrong password gets the generic message", async ({ page }) => {
  const email = newEmail();
  await signUp(page, email);
  await signOut(page);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("not the password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByText(
      "That email and password don't match. Try again or reset your password.",
    ),
  ).toBeVisible();
  await expect(page).toHaveURL("/sign-in");
});

test("signed-in visitors skip the auth pages", async ({ page }) => {
  await signUp(page, newEmail());
  await page.goto("/sign-in");
  await expect(page).toHaveURL("/documents");
  await page.goto("/sign-up");
  await expect(page).toHaveURL("/documents");
});

test("a forged session cookie counts as signed out", async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: "__session", value: "forged", url: "http://localhost:3100" },
  ]);
  await page.goto("/documents");
  await expect(page).toHaveURL("/sign-in?next=%2Fdocuments");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("the session route refuses calls from other sites", async ({
  request,
}) => {
  const res = await request.post("/api/session", {
    headers: { origin: "https://evil.example" },
    data: { idToken: "x" },
  });
  expect(res.status()).toBe(403);
});

test("the auth pages never scroll sideways", async ({ page }) => {
  for (const path of ["/sign-up", "/sign-in"]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  }
});
