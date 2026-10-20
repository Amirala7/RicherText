import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

// Atoms: a loading button keeps its label in place under the spinner (ADR 0013).
describe("Button", () => {
  it("shows its label", () => {
    render(<Button>Create account</Button>);
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeEnabled();
  });

  it("while loading is busy, disabled and keeps the hidden label", () => {
    render(<Button loading>Create account</Button>);
    const button = screen.getByRole("button", { name: "Create account" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
    expect(button.querySelector("[data-slot=label]")).toHaveClass("invisible");
    expect(button.querySelector("[data-slot=spinner]")).toBeInTheDocument();
  });

  it("has no spinner when idle", () => {
    render(<Button>Save</Button>);
    expect(
      screen.getByRole("button").querySelector("[data-slot=spinner]"),
    ).toBeNull();
  });
});
