import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/atoms/button";
import { PricingBlock } from "./pricing-block";

// Pricing block (ADR 0016, 0020, 0023, 0024): the landing pricing section,
// three cards Free · Yearly · Monthly with the same parts in the same order.
function renderBlock() {
  return render(
    <PricingBlock
      free={<Button disabled>Current plan</Button>}
      yearly={<Button>Subscribe yearly</Button>}
      monthly={<Button variant="secondary">Subscribe monthly</Button>}
    />,
  );
}

describe("PricingBlock", () => {
  it("has the section heading and line", () => {
    renderBlock();
    expect(
      screen.getByRole("heading", { name: "Simple pricing" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Start free with one document. Subscribe when you need more.",
      ),
    ).toBeInTheDocument();
  });

  it("shows Free, Yearly and Monthly in that order", () => {
    renderBlock();
    const cards = screen.getAllByRole("listitem", { name: /plan$/ });
    expect(cards.map((c) => c.getAttribute("aria-label"))).toEqual([
      "Free plan",
      "Yearly plan",
      "Monthly plan",
    ]);
  });

  it("gives every card its price, period, features, action and note", () => {
    renderBlock();
    const [free, yearly, monthly] = screen.getAllByRole("listitem", {
      name: /plan$/,
    });

    expect(free).toHaveTextContent("$0");
    expect(free).toHaveTextContent("for good");
    for (const f of [
      "Plain text, no formatting",
      "One document at a time",
      "Saves as you type",
      "No card needed",
    ]) {
      expect(within(free).getByText(f)).toBeInTheDocument();
    }
    expect(
      within(free).getByRole("button", { name: "Current plan" }),
    ).toBeDisabled();
    expect(free).toHaveTextContent("Upgrade any time from inside the app.");

    expect(yearly).toHaveTextContent("$80");
    expect(yearly).toHaveTextContent("a year");
    expect(within(yearly).getByText("Save 17%")).toBeInTheDocument();
    expect(yearly).toHaveTextContent("Works out at $6.67 a month.");

    expect(monthly).toHaveTextContent("$8");
    expect(monthly).toHaveTextContent("a month");
    expect(monthly).toHaveTextContent("Billed monthly through Stripe.");

    for (const card of [yearly, monthly]) {
      for (const f of [
        "Everything in Free",
        "Full formatting toolbar",
        "Unlimited documents",
        "Export to PDF, Word and more",
        "Cancel any time",
      ]) {
        expect(within(card).getByText(f)).toBeInTheDocument();
      }
    }
    expect(
      within(yearly).getByRole("button", { name: "Subscribe yearly" }),
    ).toBeInTheDocument();
    expect(
      within(monthly).getByRole("button", { name: "Subscribe monthly" }),
    ).toBeInTheDocument();
  });

  it("puts the Save chip only on Yearly", () => {
    renderBlock();
    expect(screen.getAllByText(/^Save \d+%$/)).toHaveLength(1);
  });

  it("tags export as coming soon on both paid cards, not on Free", () => {
    renderBlock();
    const [free, yearly, monthly] = screen.getAllByRole("listitem", {
      name: /plan$/,
    });
    for (const card of [yearly, monthly]) {
      const row = within(card)
        .getByText("Export to PDF, Word and more")
        .closest("li")!;
      expect(within(row).getByText("Coming soon")).toBeInTheDocument();
    }
    expect(within(free).queryByText("Coming soon")).toBeNull();
  });
});
