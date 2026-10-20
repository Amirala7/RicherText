import { expect, test, type Page } from "@playwright/test";

// Renders a colour to one sRGB pixel, so oklch() and the lab()/hex the build emits compare equal.
async function rendered(page: Page, colour: string) {
  return page.evaluate((c) => {
    const ctx = document.createElement("canvas").getContext("2d")!;
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    return Array.from(ctx.getImageData(0, 0, 1, 1).data);
  }, colour);
}

async function expectSameColour(page: Page, actual: string, expected: string) {
  const [a, e] = [await rendered(page, actual), await rendered(page, expected)];
  a.forEach((channel, i) =>
    expect(Math.abs(channel - e[i])).toBeLessThanOrEqual(1),
  );
}

async function bodyStyle(page: Page) {
  return page.evaluate(() => {
    const s = getComputedStyle(document.body);
    return {
      background: s.backgroundColor,
      color: s.color,
      font: s.fontFamily,
    };
  });
}

test("serves the home page in English with the product name", async ({
  page,
}) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/RicherText/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("follows a light system theme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  const body = await bodyStyle(page);
  await expectSameColour(page, body.background, "oklch(0.997 0.002 292)");
  await expectSameColour(page, body.color, "oklch(0.2 0.025 292)");
});

test("follows a dark system theme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/dark/);
  const body = await bodyStyle(page);
  await expectSameColour(page, body.background, "oklch(0.17 0.012 292)");
  await expectSameColour(page, body.color, "oklch(0.965 0.006 292)");
});

test("sets text in Geist", async ({ page }) => {
  await page.goto("/");
  expect((await bodyStyle(page)).font).toMatch(/Geist/);
});

test("never scrolls sideways", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});
