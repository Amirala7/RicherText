import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DocumentMenu } from "./document-menu";

// Document menu in the editor bar (ADR 0024, DESIGN.md app screens): label
// "Export as" and the six formats, disabled until export is built (user,
// 2026-10-21; on Free the label reads "Export · paid plans" and the items
// show a lock); divider; Delete document (danger), which asks first.
const FORMATS = [
  "PDF",
  "Word (.docx)",
  "Rich Text (.rtf)",
  "Markdown",
  "HTML",
  "Plain text",
];

function setup(paid = true) {
  const onDelete = vi.fn();
  render(<DocumentMenu title="Q4 plan" paid={paid} onDelete={onDelete} />);
  fireEvent.pointerDown(screen.getByRole("button", { name: "Document menu" }), {
    button: 0,
    ctrlKey: false,
  });
  return { menu: screen.getByRole("menu"), onDelete };
}

describe("DocumentMenu", () => {
  it("lists the export formats, disabled for now, then Delete document", () => {
    const { menu } = setup();
    expect(within(menu).getByText("Export as")).toBeInTheDocument();
    const items = within(menu).getAllByRole("menuitem");
    expect(items.map((i) => i.textContent)).toEqual([
      ...FORMATS,
      "Delete document",
    ]);
    for (const item of items.slice(0, 6))
      expect(item).toHaveAttribute("aria-disabled", "true");
    expect(items[6]).not.toHaveAttribute("aria-disabled");
  });

  it("says export is for paid plans on Free", () => {
    const { menu } = setup(false);
    expect(within(menu).getByText("Export · paid plans")).toBeInTheDocument();
    expect(within(menu).queryByText("Export as")).toBeNull();
  });

  it("asks before deleting, then deletes", () => {
    const { onDelete } = setup();
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete document" }));
    const dialog = screen.getByRole("alertdialog", {
      name: "Delete “Q4 plan”?",
    });
    expect(dialog).toHaveTextContent("This can't be undone.");
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("Cancel keeps the document", () => {
    const { onDelete } = setup();
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete document" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("tags export as coming soon on a paid plan", () => {
    const { menu } = setup();
    expect(within(menu).getByText("Coming soon")).toBeInTheDocument();
  });
});
