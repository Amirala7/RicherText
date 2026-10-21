import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LinkEditor } from "./link-editor";

// Link editor molecule (ADR 0015, DESIGN.md §3): input sm with a link icon,
// Apply, and Remove when editing a link; a floating panel under the
// selection. Enter applies, Esc closes; a bad address marks the input invalid
// and keeps the panel open (slice 4, 2026-10-21).
const anchor = () => new DOMRect(10, 10, 40, 20);

function setup(href?: string) {
  const onApply = vi.fn();
  const onRemove = vi.fn();
  const onClose = vi.fn();
  render(
    <LinkEditor
      open
      anchor={anchor}
      href={href}
      onApply={onApply}
      onRemove={onRemove}
      onClose={onClose}
    />,
  );
  const input = screen.getByRole("textbox", { name: "Link address" });
  return { input, onApply, onRemove, onClose };
}

describe("LinkEditor", () => {
  it("opens as a Link panel with the address field focused", () => {
    const { input } = setup();
    expect(screen.getByRole("dialog", { name: "Link" })).toBeInTheDocument();
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute("placeholder", "Paste or type a link");
    expect(input).toHaveValue("");
    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove link" }),
    ).not.toBeInTheDocument();
  });

  it("applies the address on Enter, with https:// added", () => {
    const { input, onApply } = setup();
    fireEvent.change(input, { target: { value: "studio.co/q4" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onApply).toHaveBeenCalledWith(
      "https://studio.co/q4",
      "studio.co/q4",
    );
  });

  it("applies with the Apply button", () => {
    const { input, onApply } = setup();
    fireEvent.change(input, { target: { value: "maya@studio.co" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledWith(
      "mailto:maya@studio.co",
      "maya@studio.co",
    );
  });

  it("marks a bad address invalid and stays open until it's fixed", () => {
    const { input, onApply, onClose } = setup();
    fireEvent.change(input, { target: { value: "hello world" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onApply).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(
      "Use a web or email address, like example.com.",
    );
    fireEvent.change(input, { target: { value: "hello.world" } });
    expect(input).not.toHaveAttribute("aria-invalid", "true");
  });

  it("edits an existing link and can remove it", () => {
    const { input, onRemove } = setup("https://studio.co/q4");
    expect(input).toHaveValue("https://studio.co/q4");
    fireEvent.click(screen.getByRole("button", { name: "Remove link" }));
    expect(onRemove).toHaveBeenCalled();
  });

  it("closes on Esc", () => {
    const { input, onClose } = setup();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
