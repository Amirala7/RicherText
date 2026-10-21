import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DocumentList } from "./document-list";

// Document list organism (ADR 0016, 0024, 0028): title · filter + New · rows;
// a row opens its document, renames in place and deletes after a dialog.
const now = new Date("2026-10-21T12:00:00Z");
const docs = [
  {
    id: "a",
    title: "Meeting notes",
    createdAt: new Date("2026-10-18T12:00:00Z"),
    updatedAt: new Date("2026-10-21T11:58:00Z"),
  },
  {
    id: "b",
    title: "",
    createdAt: new Date("2026-10-20T12:00:00Z"),
    updatedAt: new Date("2026-10-20T10:00:00Z"),
  },
];

function renderList(props: Partial<Parameters<typeof DocumentList>[0]> = {}) {
  const handlers = {
    onCreate: vi.fn(),
    onRename: vi.fn(),
    onDelete: vi.fn(),
  };
  render(
    <DocumentList
      documents={docs}
      editable={new Set(["a", "b"])}
      now={now}
      creating={false}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

const row = (name: string) =>
  screen.getByRole("link", { name: new RegExp(name) }).closest("li")!;

describe("DocumentList", () => {
  it("shows the loading box while documents load", () => {
    renderList({ documents: null });
    expect(
      screen.getByRole("status", { name: "Loading documents" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("shows the empty state with New document for a new account", () => {
    const { onCreate } = renderList({ documents: [] });
    expect(screen.getByText("No documents yet")).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "New document" }));
    expect(onCreate).toHaveBeenCalled();
  });

  it("lists documents with titles, Untitled and the edit time", () => {
    renderList();
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/documents/a",
      "/documents/b",
    ]);
    expect(
      within(row("Meeting notes")).getByText("2 min ago"),
    ).toBeInTheDocument();
    expect(within(row("Untitled")).getByText("yesterday")).toBeInTheDocument();
  });

  it("filters by title and says when nothing matches", () => {
    renderList();
    const filter = screen.getByRole("searchbox", { name: "Filter documents" });
    fireEvent.change(filter, { target: { value: "meet" } });
    expect(screen.getAllByRole("link")).toHaveLength(1);
    fireEvent.change(filter, { target: { value: "zzz" } });
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByText("No matches")).toBeInTheDocument();
  });

  it("New calls onCreate", () => {
    const { onCreate } = renderList();
    fireEvent.click(screen.getByRole("button", { name: "New" }));
    expect(onCreate).toHaveBeenCalled();
  });

  it("disables New while creating", () => {
    renderList({ creating: true });
    expect(screen.getByRole("button", { name: "New" })).toBeDisabled();
  });
});

function openMenu(name: string) {
  const trigger = within(row(name)).getByRole("button", {
    name: "Document actions",
  });
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
}

describe("DocumentList: rename in place", () => {
  it("Enter saves the trimmed title", () => {
    const { onRename } = renderList();
    openMenu("Meeting notes");
    fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));
    const input = screen.getByRole("textbox", { name: "Title" });
    expect(input).toHaveValue("Meeting notes");
    fireEvent.change(input, { target: { value: "  Q4 plan " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onRename).toHaveBeenCalledWith("a", "Q4 plan");
    expect(screen.queryByRole("textbox", { name: "Title" })).toBeNull();
  });

  it("Esc cancels", () => {
    const { onRename } = renderList();
    openMenu("Meeting notes");
    fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));
    const input = screen.getByRole("textbox", { name: "Title" });
    fireEvent.change(input, { target: { value: "Other" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onRename).not.toHaveBeenCalled();
    expect(
      screen.getByRole("link", { name: /Meeting notes/ }),
    ).toBeInTheDocument();
  });

  it("doesn't save an unchanged title", () => {
    const { onRename } = renderList();
    openMenu("Meeting notes");
    fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Title" }), {
      key: "Enter",
    });
    expect(onRename).not.toHaveBeenCalled();
  });

  it("offers Rename only on documents that can be edited", () => {
    renderList({ editable: new Set(["b"]) });
    openMenu("Meeting notes");
    expect(screen.queryByRole("menuitem", { name: "Rename" })).toBeNull();
    expect(
      screen.getByRole("menuitem", { name: "Delete" }),
    ).toBeInTheDocument();
  });
});

describe("DocumentList: delete", () => {
  it("asks in a dialog with focus on Cancel, then deletes", () => {
    const { onDelete } = renderList();
    openMenu("Meeting notes");
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    const dialog = screen.getByRole("alertdialog", {
      name: "Delete “Meeting notes”?",
    });
    expect(
      within(dialog).getByText("This can't be undone."),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Cancel" }),
    ).toHaveFocus();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith("a");
  });

  it("Cancel keeps the document", () => {
    const { onDelete } = renderList();
    openMenu("Untitled");
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});
