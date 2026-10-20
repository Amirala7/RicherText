import { expect, test, type Page } from "@playwright/test";

// Phase 2 slice 2: password reset on the Auth emulator (ADR 0026). The
// emulator doesn't send mail; it keeps the link, which stands in for the inbox.
const password = "correct horse";
const emulator = "http://127.0.0.1:9099";
const jwt = /eyJ[\w-]{8,}\.[\w-]{8,}\./;

function newEmail() {
  return `reset-${crypto.randomUUID()}@example.com`;
}

async function signUpAndOut(page: Page, email: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/documents");
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/sign-in");
}

async function requestReset(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page).toHaveURL("/reset-password");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send link" }).click();
  await expect(
    page.getByRole("heading", { name: "Reset link sent" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      `If there's an account for ${email}, a link to choose a new password is on its way. It works for one hour.`,
    ),
  ).toBeVisible();
}

async function resetLinks(email: string) {
  const res = await fetch(
    `${emulator}/emulator/v1/projects/demo-richertext/oobCodes`,
  );
  const { oobCodes } = (await res.json()) as {
    oobCodes: {
      email: string;
      requestType: string;
      oobCode: string;
      oobLink: string;
    }[];
  };
  return oobCodes.filter(
    (c) => c.email === email && c.requestType === "PASSWORD_RESET",
  );
}

async function signIn(page: Page, email: string, pw: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(pw);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("a reset link lets the user choose a new password and sign in with it", async ({
  page,
}) => {
  const email = newEmail();
  await signUpAndOut(page, email);
  await requestReset(page, email);

  const [link] = await resetLinks(email);
  expect(link).toBeDefined();
  expect(new URL(link.oobLink).searchParams.get("continueUrl")).toBe(
    "http://localhost:3100/sign-in",
  );

  // What Firebase's hosted page does when the new password is submitted.
  const res = await fetch(
    `${emulator}/identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=demo-key`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        oobCode: link.oobCode,
        newPassword: "brand new pass",
      }),
    },
  );
  expect(res.status).toBe(200);

  await signIn(page, email, password);
  await expect(
    page.getByText(
      "That email and password don't match. Try again or reset your password.",
    ),
  ).toBeVisible();
  await signIn(page, email, "brand new pass");
  await expect(page).toHaveURL("/documents");
});

test("an email without an account gets the same confirmation", async ({
  page,
}) => {
  const email = newEmail();
  await requestReset(page, email);
  expect(await resetLinks(email)).toHaveLength(0);
});

test("back to sign in leaves the reset page", async ({ page }) => {
  await page.goto("/reset-password");
  await page.getByRole("link", { name: "Back to sign in" }).click();
  await expect(page).toHaveURL("/sign-in");
});

test("signed-in visitors skip the reset page", async ({ page }) => {
  const email = newEmail();
  await signUpAndOut(page, email);
  await signIn(page, email, password);
  await expect(page).toHaveURL("/documents");
  await page.goto("/reset-password");
  await expect(page).toHaveURL("/documents");
});

test("the reset page never scrolls sideways", async ({ page }) => {
  await page.goto("/reset-password");
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

test("asking for a reset prints no email or token", async ({ page }) => {
  const email = newEmail();
  const printed: string[] = [];
  page.on("console", (m) => printed.push(m.text()));
  page.on("pageerror", (e) => printed.push(e.message));
  await requestReset(page, email);
  const all = printed.join("\n");
  expect(all).not.toContain(email);
  expect(all).not.toMatch(jwt);
});
