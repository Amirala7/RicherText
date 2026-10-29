import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SpellingMenu } from "./spelling-menu";

// Spelling suggestions menu (ADR 0036, DESIGN.md §3): the menu molecule,
// under the misspelt word: up to 5 suggestions, a divider, Ignore; "No
// suggestions" when there are none. The first suggestion has focus, arrows
// move, Enter picks, Esc closes.
const anchor = new DOMRect(10, 10, 40, 20);

function setup(suggestions: string[]) {
  const onPick = vi.fn();
  const onIgnore = vi.fn();
  const onClose = vi.fn();
  render(
    <SpellingMenu
      anchor={anchor}
      suggestions={suggestions}
      onPick={onPick}
      onIgnore={onIgnore}
      onClose={onClose}
    />,
  );
  const menu = screen.getByRole("menu", { name: "Spelling suggestions" });
  const items = () => within(menu).getAllByRole("menuitem");
  return { menu, items, onPick, onIgnore, onClose };
}

describe("SpellingMenu", () => {
  it("lists up to 5 suggestions, then Ignore", () => {
    const { items } = setup(["a", "b", "c", "d", "e", "f", "g"]);
    expect(items().map((i) => i.textContent)).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
      "Ignore",
    ]);
  });

  it("says when there are no suggestions, and still offers Ignore", () => {
    const { menu, items } = setup([]);
    expect(within(menu).getByText("No suggestions")).toBeInTheDocument();
    expect(items().map((i) => i.textContent)).toEqual(["Ignore"]);
  });

  it("puts focus on the first suggestion", () => {
    const { items } = setup(["the", "ten"]);
    expect(items()[0]).toHaveFocus();
  });

  it("moves with the arrows and picks with Enter", async () => {
    const { items, onPick } = setup(["the", "ten"]);
    fireEvent.keyDown(items()[0], { key: "ArrowDown" });
    await waitFor(() => expect(items()[1]).toHaveFocus());
    fireEvent.keyDown(items()[1], { key: "Enter" });
    expect(onPick).toHaveBeenCalledWith("ten");
  });

  it("picks a suggestion on click", () => {
    const { items, onPick } = setup(["the", "ten"]);
    fireEvent.click(items()[0]);
    expect(onPick).toHaveBeenCalledWith("the");
  });

  it("ignores the word", () => {
    const { onIgnore, onPick } = setup(["the"]);
    fireEvent.click(screen.getByRole("menuitem", { name: "Ignore" }));
    expect(onIgnore).toHaveBeenCalled();
    expect(onPick).not.toHaveBeenCalled();
  });

  it("closes on Esc", () => {
    const { items, onClose, onPick } = setup(["the"]);
    fireEvent.keyDown(items()[0], { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
    expect(onPick).not.toHaveBeenCalled();
  });
});
