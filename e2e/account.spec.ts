import { expect, test, type Page } from "@playwright/test";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { Timestamp, getFirestore } from "firebase-admin/firestore";

// Phase 3 slice 3 end to end on the emulators (ADR 0024, 0027): the account
// page's subscription states and the Customer Portal. The test server runs
// with a placeholder Stripe key, so the Portal itself can't open; the webhook
// is played by writing with the Admin SDK.
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
const admin = getApps()[0] ?? initializeApp({ projectId: "demo-richertext" });
const db = getFirestore(admin);

const password = "correct horse";

async function signUpFree(page: Page) {
  const email = `e2e-${crypto.randomUUID()}@example.com`;
  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/documents");
  const uid = (await getAuth(admin).getUserByEmail(email)).uid;
  return { email, uid };
}

// What the webhook writes (ADR 0027). The period ends next year, so the
// date always shows its year.
const periodEnd = new Date(Date.UTC(new Date().getUTCFullYear() + 1, 10, 19));

async function writeSubscription(
  uid: string,
  sub: { status: string; cancelAtPeriodEnd?: boolean; interval?: string },
) {
  await db.doc(`customers/${uid}/subscriptions/sub_e2e`).set({
    status: sub.status,
    interval: sub.interval ?? "year",
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
    currentPeriodEnd: Timestamp.fromDate(periodEnd),
  });
  await db
    .doc(`customers/${uid}`)
    .set({ stripeCustomerId: "cus_e2e", plan: "paid" }, { merge: true });
}

function subscription(page: Page) {
  return page.getByRole("region", { name: "Subscription" });
}

// Next.js keeps its own route announcer as role=alert, so match the toast's text.
function portalToast(page: Page) {
  return page
    .getByRole("alert")
    .filter({ hasText: "Couldn't open the billing portal. Try again." });
}

async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

const year = periodEnd.getUTCFullYear();

test("the account menu leads to the account page", async ({ page }) => {
  await signUpFree(page);
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Account" }).click();
  await expect(page).toHaveURL("/account");
  await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
});

test("a Free user sees their email, the Free plan and Upgrade", async ({
  page,
}) => {
  const { email } = await signUpFree(page);
  await page.goto("/account");
  await expect(
    page.getByRole("region", { name: "Profile" }).getByText(email),
  ).toBeVisible();
  await expect(
    subscription(page).getByText("Free", { exact: true }),
  ).toBeVisible();
  await subscription(page).getByRole("link", { name: "Upgrade" }).click();
  await expect(page).toHaveURL("/plans");
});

test("a paid user sees the plan and its renewal, with Manage", async ({
  page,
}) => {
  const { uid } = await signUpFree(page);
  await writeSubscription(uid, { status: "active" });
  await page.goto("/account");
  await expect(
    subscription(page).getByText(`Yearly, renews 19 Nov ${year}`),
  ).toBeVisible();
  await expect(
    subscription(page).getByRole("button", { name: "Manage" }),
  ).toBeVisible();
  await noSidewaysScroll(page);
});

test("the page follows changes made in the Portal without a reload", async ({
  page,
}) => {
  const { uid } = await signUpFree(page);
  await writeSubscription(uid, { status: "active" });
  await page.goto("/account");
  await expect(
    subscription(page).getByRole("button", { name: "Manage" }),
  ).toBeVisible();

  await writeSubscription(uid, { status: "active", cancelAtPeriodEnd: true });
  await expect(
    subscription(page).getByText(`Ends 19 Nov ${year}`),
  ).toBeVisible();
  await expect(
    subscription(page).getByRole("button", { name: "Resubscribe" }),
  ).toBeVisible();
});

test("a failed payment shows the warning and Update card", async ({ page }) => {
  const { uid } = await signUpFree(page);
  await writeSubscription(uid, { status: "past_due", interval: "month" });
  await page.goto("/account");
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Your last payment didn't go through." }),
  ).toBeVisible();
  await expect(subscription(page).getByText("Payment due")).toBeVisible();
  await expect(
    subscription(page).getByRole("button", { name: "Update card" }),
  ).toBeVisible();
  await noSidewaysScroll(page);
});

test("when the Portal can't open, it says so and stays on the account page", async ({
  page,
}) => {
  const { uid } = await signUpFree(page);
  await writeSubscription(uid, { status: "active" });
  await page.goto("/account");
  const portal = page.waitForResponse("**/api/billing/portal");
  await subscription(page).getByRole("button", { name: "Manage" }).click();
  expect((await portal).status()).toBe(502);
  await expect(portalToast(page)).toBeVisible();
  await expect(page).toHaveURL("/account");
});

test("a signed-out visitor is sent to sign in", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(
    `/sign-in?next=${encodeURIComponent("/account")}`,
  );
});

test.describe("the Portal route", () => {
  const url = "/api/billing/portal";

  test("refuses a visitor who isn't signed in", async ({ page, baseURL }) => {
    const res = await page.request.post(url, {
      headers: { origin: baseURL! },
    });
    expect(res.status()).toBe(401);
  });

  test("refuses a request from another site", async ({ page }) => {
    await signUpFree(page);
    const res = await page.request.post(url, {
      headers: { origin: "https://evil.example" },
    });
    expect(res.status()).toBe(403);
  });

  test("sends a user with no Stripe customer to the plans page", async ({
    page,
    baseURL,
  }) => {
    await signUpFree(page);
    const res = await page.request.post(url, {
      headers: { origin: baseURL! },
    });
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ url: "/plans" });
  });
});
