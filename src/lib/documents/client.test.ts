import { afterEach, describe, expect, it, vi } from "vitest";
import { requestCreate, requestDelete } from "./client";

// The browser side of the document routes (ADR 0028).
function respond(status: number, body?: unknown) {
  const fetchMock = vi.fn(
    async () =>
      new Response(body === undefined ? null : JSON.stringify(body), {
        status,
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestCreate", () => {
  it("posts to the documents route and returns the new id", async () => {
    const fetchMock = respond(201, { id: "abc" });
    expect(await requestCreate()).toEqual({ kind: "created", id: "abc" });
    expect(fetchMock).toHaveBeenCalledWith("/api/documents", {
      method: "POST",
    });
  });

  it("reports the Free limit", async () => {
    respond(403, { error: "limit" });
    expect(await requestCreate()).toEqual({ kind: "limit" });
  });

  it("throws on anything else", async () => {
    respond(503, { error: "unavailable" });
    await expect(requestCreate()).rejects.toThrow();
    respond(403, { error: "forbidden" });
    await expect(requestCreate()).rejects.toThrow();
  });
});

describe("requestDelete", () => {
  it("deletes through the route", async () => {
    const fetchMock = respond(204);
    await requestDelete("abc");
    expect(fetchMock).toHaveBeenCalledWith("/api/documents/abc", {
      method: "DELETE",
    });
  });

  it("treats an already deleted document as done", async () => {
    respond(404, { error: "not found" });
    await expect(requestDelete("abc")).resolves.toBeUndefined();
  });

  it("throws when the delete failed", async () => {
    respond(503, { error: "unavailable" });
    await expect(requestDelete("abc")).rejects.toThrow();
  });
});
