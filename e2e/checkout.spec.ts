import { expect, test, type Page } from "@playwright/test";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Phase 3 slice 2 end to end on the emulators (ADR 0024, 0027). The test
// server runs with a placeholder Stripe key, so Checkout itself can't open;
// the webhook is played by writing the plan with the Admin SDK.
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
const admin = getApps()[0] ?? initializeApp({ projectId: "demo-richertext" });
const db = getFirestore(admin);

const password = "correct horse";
const newEmail = () => `e2e-${crypto.randomUUID()}@example.com`;

async function signUp(page: Page, path = "/sign-up") {
  const email = newEmail();
  await page.goto(path);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  return email;
}

async function signUpFree(page: Page) {
  const email = await signUp(page);
  await expect(page).toHaveURL("/documents");
  return (await getAuth(admin).getUserByEmail(email)).uid;
}

// What the webhook writes once Stripe confirms (ADR 0027).
async function markPaid(uid: string, interval: "year" | "month" = "year") {
  await db.doc(`customers/${uid}/subscriptions/sub_e2e`).set({
    status: "active",
    interval,
    cancelAtPeriodEnd: false,
  });
  await db
    .doc(`customers/${uid}`)
    .set({ stripeCustomerId: "cus_e2e", plan: "paid" }, { merge: true });
}

// Next.js keeps its own route announcer as role=alert, so match the toast's text.
function checkoutToast(page: Page) {
  return page
    .getByRole("alert")
    .filter({ hasText: "Couldn't open Stripe Checkout. Try again." });
}

async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test("the plans page shows Free, Yearly and Monthly, Free as the current plan", async ({
  page,
}) => {
  await signUpFree(page);
  await page.goto("/plans");
  await expect(
    page.getByRole("heading", { name: "Simple pricing" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Current plan" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Subscribe yearly" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Subscribe monthly" }),
  ).toBeEnabled();
  await noSidewaysScroll(page);
});

test("a paid user going to the plans page lands on the documents page", async ({
  page,
}) => {
  const uid = await signUpFree(page);
  await markPaid(uid);
  await page.goto("/plans");
  await expect(page).toHaveURL("/documents");
});

test("subscribing when Checkout can't open says so and stays on the plans page", async ({
  page,
}) => {
  await signUpFree(page);
  await page.goto("/plans");
  const checkout = page.waitForResponse("**/api/billing/checkout");
  await page.getByRole("button", { name: "Subscribe yearly" }).click();
  expect((await checkout).status()).toBe(502);
  await expect(checkoutToast(page)).toBeVisible();
  await expect(page).toHaveURL("/plans");
});

test("back from Checkout, the page waits, names the plan, then opens documents", async ({
  page,
}) => {
  const uid = await signUpFree(page);
  await page.goto("/welcome");
  await expect(page.getByRole("status")).toContainText("Activating your plan");
  await noSidewaysScroll(page);

  await markPaid(uid, "year");
  await expect(page.getByRole("status")).toContainText("You're on Yearly");
  await expect(page).toHaveURL("/documents");
});

test("names Monthly when that's the plan", async ({ page }) => {
  const uid = await signUpFree(page);
  await page.goto("/welcome");
  await markPaid(uid, "month");
  await expect(page.getByRole("status")).toContainText("You're on Monthly");
});

test("when Stripe is slow, it offers a way on after 20 seconds", async ({
  page,
}) => {
  await signUpFree(page);
  await page.clock.install();
  await page.goto("/welcome");
  await expect(page.getByRole("status")).toContainText("Activating your plan");
  await page.clock.fastForward(21_000);
  await expect(page.getByRole("status")).toContainText(
    "Still waiting on Stripe",
  );
  await page.getByRole("link", { name: "Go to documents" }).click();
  await expect(page).toHaveURL("/documents");
});

test("signing up for a plan names it, then heads for Checkout", async ({
  page,
}) => {
  await page.goto("/sign-up?plan=yearly");
  await expect(
    page.getByText("Next, you'll pay for Yearly ($80) with Stripe."),
  ).toBeVisible();
  const checkout = page.waitForResponse("**/api/billing/checkout");
  await signUp(page, "/sign-up?plan=yearly");
  const res = await checkout;
  expect(JSON.parse(res.request().postData() ?? "{}")).toEqual({
    plan: "yearly",
  });
  // No real Stripe key here, so it lands on the plans page with the error.
  await expect(page).toHaveURL("/plans");
  await expect(checkoutToast(page)).toBeVisible();
});

test("a signed-in visitor who picks a plan on sign up goes to the plans page", async ({
  page,
}) => {
  await signUpFree(page);
  await page.goto("/sign-up?plan=monthly");
  await expect(page).toHaveURL("/plans");
});

test.describe("the Checkout route", () => {
  const url = "/api/billing/checkout";

  test("refuses a visitor who isn't signed in", async ({ page, baseURL }) => {
    const res = await page.request.post(url, {
      data: { plan: "yearly" },
      headers: { origin: baseURL! },
    });
    expect(res.status()).toBe(401);
  });

  test("refuses a request from another site", async ({ page }) => {
    await signUpFree(page);
    const res = await page.request.post(url, {
      data: { plan: "yearly" },
      headers: { origin: "https://evil.example" },
    });
    expect(res.status()).toBe(403);
  });

  test("refuses a plan it doesn't sell", async ({ page, baseURL }) => {
    await signUpFree(page);
    const res = await page.request.post(url, {
      data: { plan: "lifetime" },
      headers: { origin: baseURL! },
    });
    expect(res.status()).toBe(400);
  });
});
