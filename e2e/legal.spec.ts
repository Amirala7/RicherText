import { expect, test } from "@playwright/test";

// Terms, Privacy, Refunds (Phase 5): static template pages for this demo
// project, reached from the footer, logotype bar back home.
const PAGES = [
  { path: "/terms", title: "Terms of service" },
  { path: "/privacy", title: "Privacy policy" },
  { path: "/refunds", title: "Refund policy" },
];

for (const { path, title } of PAGES) {
  test(`${path} is a public page titled "${title}"`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(`${title} · RicherText`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.getByText(/demo project/i).first()).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
}

test("the footer links reach every legal page and the logo goes home", async ({
  page,
}) => {
  await page.goto("/");
  const legal = page.getByRole("navigation", { name: "Legal" });
  for (const { path, title } of PAGES) {
    await legal.getByRole("link", { name: title.split(" ")[0] }).click();
    await expect(page).toHaveURL(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  }
  await page.getByRole("link", { name: "RicherText home" }).click();
  await expect(page).toHaveURL("/");
});
