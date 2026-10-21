import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SavedIndicator } from "./saved-indicator";

// Saved indicator molecule (ADR 0015, 0029): Saved / Saving / Saved on device
// / Not saved · Retry, all stacked in one box so the width never changes.
// Screen readers hear only errors and Saved on device.
const visible = () =>
  screen
    .getAllByTestId("saved-state")
    .filter((el) => !el.classList.contains("invisible"))
    .map((el) => el.textContent);

describe("SavedIndicator", () => {
  it.each([
    ["saved", "Saved"],
    ["saving", "Saving"],
    ["device", "Saved on device"],
    ["error", "Not saved · Retry"],
  ] as const)("shows only %s", (state, text) => {
    render(<SavedIndicator state={state} onRetry={() => {}} />);
    expect(visible()).toEqual([text]);
    expect(screen.getAllByTestId("saved-state")).toHaveLength(4);
  });

  it.each([
    ["saved", ""],
    ["saving", ""],
    ["device", "Saved on device"],
    ["error", "Not saved"],
  ] as const)("announces %s politely as %j", (state, text) => {
    render(<SavedIndicator state={state} onRetry={() => {}} />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent(text, { normalizeWhitespace: true });
    if (!text) expect(status.textContent).toBe("");
  });

  it("Retry asks for the save again", () => {
    const onRetry = vi.fn();
    render(<SavedIndicator state="error" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("hidden states can't be reached by keyboard", () => {
    render(<SavedIndicator state="saved" onRetry={() => {}} />);
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });
});

// Quiet placement (user, 2026-10-21): xs text, faded; problems never faded.
describe("SavedIndicator, quiet", () => {
  const box = () => screen.getAllByTestId("saved-state")[0].parentElement!;

  it.each([
    ["saved", "opacity-50"],
    ["saving", "opacity-70"],
    ["device", "opacity-70"],
    ["error", "opacity-100"],
  ] as const)("fades %s to %s", (state, opacity) => {
    render(<SavedIndicator state={state} onRetry={() => {}} />);
    expect(box()).toHaveClass(opacity);
  });

  it("uses the xs text size", () => {
    render(<SavedIndicator state="saved" onRetry={() => {}} />);
    expect(box()).toHaveClass("text-xs");
  });
});
