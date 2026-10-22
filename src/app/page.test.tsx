import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./page";

// Landing page (ADR 0021, 0023, DESIGN.md §5): one job, get a visitor to
// subscribe, with Start free as the second way in.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", NoopObserver);
  vi.stubGlobal("ResizeObserver", NoopObserver);
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: query.includes("reduce"),
        media: query,
        addEventListener() {},
        removeEventListener() {},
      }) as unknown as MediaQueryList,
  );
});

const hrefOf = (el: HTMLElement) => el.getAttribute("href");

describe("landing page", () => {
  it("has one h1 with the product name and the headline", () => {
    render(<Home />);
    const h1 = screen.getAllByRole("heading", { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0]).toHaveTextContent(
      "RicherText: Rich text, minus the clutter.",
    );
  });

  it("shows the sections in the approved order", () => {
    render(<Home />);
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
    ).toEqual([
      "The formatting you use. Nothing else.",
      "Loved by people who type.",
      "Simple pricing",
      "Questions",
      "Your next draft starts here.",
    ]);
  });

  it("links the pill header to the sections and to sign in", () => {
    render(<Home />);
    const nav = screen.getByRole("navigation", { name: "Site" });
    const link = (name: string) =>
      hrefOf(within(nav).getByRole("link", { name }));
    expect(link("Features")).toBe("#features");
    expect(link("Pricing")).toBe("#pricing");
    expect(link("FAQ")).toBe("#faq");
    expect(link("Sign in")).toBe("/sign-in");
    expect(link("Subscribe")).toBe("#pricing");
    expect(link("RicherText, home")).toBe("#top");
  });

  it("offers Subscribe first and Start free second, in the hero and at the end", () => {
    render(<Home />);
    for (const id of ["top", "start"]) {
      const area = document.getElementById(id)!;
      const links = within(area)
        .getAllByRole("link")
        .filter((a) => /Subscribe|Start free/.test(a.textContent ?? ""));
      expect(links.map((a) => [a.textContent, hrefOf(a)])).toEqual([
        ["Subscribe", "#pricing"],
        ["Start free", "/sign-up"],
      ]);
      expect(area).toHaveTextContent(
        "$80 a year or $8 a month. Free plan: one document, plain text.",
      );
    }
  });

  it("sends each plan to sign up with that plan", () => {
    render(<Home />);
    const card = (name: string) =>
      screen.getByRole("listitem", { name: `${name} plan` });
    expect(
      hrefOf(within(card("Free")).getByRole("link", { name: "Start free" })),
    ).toBe("/sign-up");
    expect(
      hrefOf(
        within(card("Yearly")).getByRole("link", { name: "Subscribe yearly" }),
      ),
    ).toBe("/sign-up?plan=yearly");
    expect(
      hrefOf(
        within(card("Monthly")).getByRole("link", {
          name: "Subscribe monthly",
        }),
      ),
    ).toBe("/sign-up?plan=monthly");
  });

  it("has six feature cards", () => {
    render(<Home />);
    const features = document.getElementById("features")!;
    expect(
      within(features)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual([
      "Format as fast as you think",
      "Links in a keystroke",
      "Saves as you type",
      "Pastes cleanly, both ways",
      "Export to your favourite format",
      "Sans or serif, light or dark",
    ]);
  });

  it("answers eight questions in native disclosure rows, closed at first", () => {
    render(<Home />);
    const faq = document.getElementById("faq")!;
    const rows = faq.querySelectorAll("details");
    expect(rows).toHaveLength(8);
    rows.forEach((row) => expect(row.open).toBe(false));
    expect(faq).toHaveTextContent("Is there really a free plan?");
    expect(faq).toHaveTextContent("How do I cancel?");
  });

  it("shows three reviews with five stars each", () => {
    render(<Home />);
    const reviews = document.getElementById("reviews")!;
    expect(within(reviews).getAllByLabelText("5 out of 5")).toHaveLength(3);
  });

  it("ends with the legal links", () => {
    render(<Home />);
    const legal = screen.getByRole("navigation", { name: "Legal" });
    expect(
      within(legal)
        .getAllByRole("link")
        .map((a) => hrefOf(a)),
    ).toEqual(["/terms", "/privacy", "/refunds"]);
  });

  it("hides the decorative hero (logo, typed line, toolbar, keyboard) from screen readers", () => {
    render(<Home />);
    const hero = document.getElementById("top")!;
    for (const sel of [
      "[data-hero=logo]",
      "[data-hero=typed]",
      "[data-hero=toolbar]",
      "[data-hero=keyboard]",
    ]) {
      expect(
        hero.querySelector(sel)?.closest("[aria-hidden=true]"),
      ).not.toBeNull();
    }
  });

  it("tags export as coming soon, in its feature card and the FAQ", () => {
    render(<Home />);
    const features = document.getElementById("features")!;
    const card = within(features)
      .getByRole("heading", { name: "Export to your favourite format" })
      .closest("li")!;
    expect(within(card).getByText("Coming soon")).toBeInTheDocument();
    expect(within(features).getAllByText("Coming soon")).toHaveLength(1);
    const faq = document.getElementById("faq")!;
    const row = within(faq)
      .getByText("Can I export to Word or PDF?")
      .closest("details")!;
    expect(row).toHaveTextContent(/^Can I export to Word or PDF\?Not yet/);
    expect(row).toHaveTextContent("coming soon");
  });
});
