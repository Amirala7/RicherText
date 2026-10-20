import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SignUpForm } from "./auth-forms";

// Sign up after picking a plan (ADR 0024): the line names the next step,
// paying for that plan with Stripe.
describe("SignUpForm with a plan", () => {
  it("names the plan and Stripe as the next step", () => {
    render(<SignUpForm onSubmit={vi.fn()} plan="yearly" />);
    expect(screen.getByText(/Next, you'll pay for/)).toHaveTextContent(
      "Next, you'll pay for Yearly ($80) with Stripe.",
    );
    expect(
      screen.queryByText("Free for one document. No card needed."),
    ).not.toBeInTheDocument();
  });

  it("works for monthly too", () => {
    render(<SignUpForm onSubmit={vi.fn()} plan="monthly" />);
    expect(screen.getByText(/Next, you'll pay for/)).toHaveTextContent(
      "Next, you'll pay for Monthly ($8) with Stripe.",
    );
  });

  it("keeps the plan when linking to sign in", () => {
    render(<SignUpForm onSubmit={vi.fn()} plan="yearly" />);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/sign-in?next=%2Fplans",
    );
  });
});
