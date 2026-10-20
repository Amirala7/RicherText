import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Activation } from "./activation";

// Back from Checkout (ADR 0024): waits for Stripe's confirmation, then says
// which plan is on; after 20s offers a way on. Every state stays in the same
// box so nothing moves (ADR 0013).
describe("Activation", () => {
  it("waits for Stripe while the plan isn't on yet", () => {
    render(<Activation state="waiting" />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Activating your plan");
    expect(status).toHaveTextContent(
      "Waiting for Stripe to confirm. This takes a few seconds.",
    );
    expect(
      screen.queryByRole("link", { name: "Go to documents" }),
    ).not.toBeInTheDocument();
  });

  it("names the plan once it's on", () => {
    render(<Activation state="done" planName="Yearly" />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("You're on Yearly");
    expect(status).toHaveTextContent("Taking you to your documents…");
    expect(status).not.toHaveTextContent("Activating your plan");
  });

  it("falls back to a plain line when the plan's name isn't known", () => {
    render(<Activation state="done" />);
    expect(screen.getByRole("status")).toHaveTextContent("Your plan is active");
  });

  it("offers a way on when Stripe is slow", () => {
    render(<Activation state="slow" />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Still waiting on Stripe");
    expect(status).toHaveTextContent(
      "Your plan switches on by itself as soon as Stripe confirms.",
    );
    expect(
      screen.getByRole("link", { name: "Go to documents" }),
    ).toHaveAttribute("href", "/documents");
  });

  it("keeps the button's space in every state, so nothing moves", () => {
    const { container, rerender } = render(<Activation state="waiting" />);
    const slot = () => container.querySelector("[data-slot=action]");
    expect(slot()).toBeInTheDocument();
    expect(slot()).toHaveClass("invisible");
    rerender(<Activation state="slow" />);
    expect(slot()).not.toHaveClass("invisible");
  });
});
