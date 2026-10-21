import { expect, test, type Page } from "@playwright/test";

// Landing page end to end (ADR 0021, 0023, DESIGN.md §5): static HTML for
// search engines, hero typing, feature demos, phone menu, sign-up paths.
const isPhone = (name: string) => name === "phone";

const noSideScroll = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

test("the page is complete HTML without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Rich text, minus the clutter/,
    }),
  ).toBeAttached();
  await expect(page.getByText("Is there really a free plan?")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Subscribe yearly" }),
  ).toBeVisible();
  await context.close();
});

test("has a description for search results", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /.{50,}/,
  );
});

test("a plan button leads to sign up with that plan", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Subscribe yearly" }).click();
  await expect(page).toHaveURL("/sign-up?plan=yearly");
});

test("FAQ rows open and close", async ({ page }) => {
  await page.goto("/");
  const row = page.locator("details", { hasText: "How do I cancel?" });
  await row.locator("summary").click();
  await expect(row).toHaveAttribute("open", "");
  await expect(row.getByText(/from your account page/)).toBeVisible();
  await row.locator("summary").click();
  await expect(row).not.toHaveAttribute("open", "");
});

test("the pill header stays on screen while scrolling", async ({ page }) => {
  await page.goto("/");
  await page.locator("#faq").scrollIntoViewIfNeeded();
  const pill = page.getByRole("navigation", { name: "Site" });
  await expect(pill).toBeInViewport();
});

test("never scrolls sideways, in light and dark", async ({ page }) => {
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    expect(await noSideScroll(page)).toBe(0);
  }
});

test("the phone menu holds the links; the keyboard is hidden", async ({
  page,
}, info) => {
  test.skip(!isPhone(info.project.name), "phone only");
  await page.goto("/");
  await expect(page.locator("[data-hero=keyboard]")).toBeHidden();
  const menuButton = page.getByRole("button", { name: "Menu" });
  await menuButton.click();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  const menu = page.getByRole("menu");
  for (const name of ["Features", "Pricing", "FAQ", "Sign in", "Start free"]) {
    await expect(menu.getByRole("menuitem", { name })).toBeVisible();
  }
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
});

test("a visitor's typing takes over the hero line", async ({ page }, info) => {
  test.skip(isPhone(info.project.name), "keyboard is desktop only");
  await page.goto("/");
  await expect(page.locator("[data-hero=keyboard]")).toBeVisible();
  // Visitor typing starts once the hero's script is running.
  await expect(page.locator("[data-hero=typed]")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.keyboard.type("hello");
  await expect(page.locator("[data-hero=typed]")).toHaveText("hello");
  await page.keyboard.press("Backspace");
  await expect(page.locator("[data-hero=typed]")).toHaveText("hell");
});

test("under reduced motion the hero and demos show their finished state", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("[data-hero=typed]")).toHaveText(
    "Rich text, minus the clutter.",
  );
  await page.locator("#features").scrollIntoViewIfNeeded();
  await expect(page.locator("[data-demo=format]")).toHaveAttribute(
    "data-step",
    "4",
  );
  await expect(page.locator("[data-demo=link] [data-linked=true]")).toHaveCount(
    1,
  );
  await page.waitForTimeout(3000);
  await expect(page.locator("[data-hero=typed]")).toHaveText(
    "Rich text, minus the clutter.",
  );
});

test("the hero line rotates on its own", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-hero=typed]")).not.toHaveText(
    "Rich text, minus the clutter.",
    { timeout: 10_000 },
  );
});
