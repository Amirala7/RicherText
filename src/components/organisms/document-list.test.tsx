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

// Plan ended (ADR 0020, 0024; DESIGN.md "Read-only state"): read-only rows
// carry a Read-only chip in place of the edit time, and a notice with
// Resubscribe sits between the filter row and the rows.
describe("DocumentList: read-only documents", () => {
  it("shows the Read-only chip instead of the edit time", () => {
    renderList({ editable: new Set(["b"]) });
    const readOnly = row("Meeting notes");
    expect(within(readOnly).getByText("Read-only")).toBeInTheDocument();
    expect(within(readOnly).queryByText("2 min ago")).toBeNull();
    expect(
      screen.getByRole("link", { name: /Meeting notes.*Read-only/ }),
    ).toHaveAttribute("href", "/documents/a");
    expect(within(row("Untitled")).queryByText("Read-only")).toBeNull();
    expect(within(row("Untitled")).getByText("yesterday")).toBeInTheDocument();
  });

  it("explains it in a notice with Resubscribe, above the rows", () => {
    renderList({ editable: new Set(["b"]) });
    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent(
      "Your plan has ended. Your newest document stays editable; the others are read-only.",
    );
    expect(
      within(notice).getByRole("link", { name: "Resubscribe" }),
    ).toHaveAttribute("href", "/plans");
    expect(
      notice.compareDocumentPosition(screen.getByRole("list")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("keeps the notice while filtering", () => {
    renderList({ editable: new Set(["b"]) });
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Filter documents" }),
      { target: { value: "zzz" } },
    );
    expect(
      screen.getByRole("link", { name: "Resubscribe" }),
    ).toBeInTheDocument();
  });

  it("shows no notice or chips when every document can be edited", () => {
    renderList();
    expect(screen.queryByRole("link", { name: "Resubscribe" })).toBeNull();
    expect(screen.queryByText("Read-only")).toBeNull();
  });
});
