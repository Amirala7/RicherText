import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { SpellDictionary } from "./spelling";
import {
  createSpellClient,
  createSpellService,
  DICTIONARY_FILES,
  type SpellPort,
  type SpellReply,
  type SpellRequest,
} from "./spelling-worker";

// Spell check worker (ADR 0036): the service runs inside the Web Worker and
// answers check/suggest requests; the client runs in the editor, talks to it
// by messages and drops replies that are out of date.
const dict: SpellDictionary = {
  correct: (word) => ["the", "launch", "is", "late"].includes(word),
  suggest: (word) => (word === "teh" ? ["ten", "the"] : []),
};

function check(block: string, version: number, text: string): SpellRequest {
  return { type: "check", block, version, text, skip: [], ignore: [] };
}

describe("spell service (inside the worker)", () => {
  it("checks a block and replies with its id and version", async () => {
    const replies: SpellReply[] = [];
    const handle = createSpellService(
      async () => dict,
      (r) => replies.push(r),
    );
    await handle(check("b1", 3, "teh launch is laet"));
    expect(replies).toEqual([
      {
        type: "checked",
        block: "b1",
        version: 3,
        misspellings: [
          { from: 0, to: 3, word: "teh" },
          { from: 14, to: 18, word: "laet" },
        ],
      },
    ]);
  });

  it("passes the skip ranges and the ignore list to the checker", async () => {
    const replies: SpellReply[] = [];
    const handle = createSpellService(
      async () => dict,
      (r) => replies.push(r),
    );
    await handle({
      type: "check",
      block: "b1",
      version: 1,
      text: "teh launch is laet",
      skip: [[0, 3]],
      ignore: ["laet"],
    });
    expect(replies).toEqual([
      { type: "checked", block: "b1", version: 1, misspellings: [] },
    ]);
  });

  it("replies to a suggest request with the ranked suggestions", async () => {
    const replies: SpellReply[] = [];
    const handle = createSpellService(
      async () => dict,
      (r) => replies.push(r),
    );
    await handle({ type: "suggest", id: 7, word: "teh" });
    expect(replies).toEqual([
      { type: "suggestions", id: 7, suggestions: ["the", "ten"] },
    ]);
  });

  it("loads the dictionary only once, even for requests at the same time", async () => {
    const load = vi.fn(async () => dict);
    const handle = createSpellService(load, () => {});
    await Promise.all([
      handle({ type: "load" }),
      handle(check("b1", 1, "teh")),
      handle(check("b2", 1, "laet")),
    ]);
    await handle({ type: "suggest", id: 1, word: "teh" });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("doesn't load the dictionary until the first request", () => {
    const load = vi.fn(async () => dict);
    createSpellService(load, () => {});
    expect(load).not.toHaveBeenCalled();
  });

  it("replies with nothing found when the dictionary can't load, and tries again next time", async () => {
    const replies: SpellReply[] = [];
    const load = vi
      .fn<() => Promise<SpellDictionary>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(dict);
    const handle = createSpellService(load, (r) => replies.push(r));
    await handle(check("b1", 1, "teh"));
    await handle(check("b1", 2, "teh"));
    expect(load).toHaveBeenCalledTimes(2);
    expect(replies).toEqual([
      { type: "checked", block: "b1", version: 1, misspellings: [] },
      {
        type: "checked",
        block: "b1",
        version: 2,
        misspellings: [{ from: 0, to: 3, word: "teh" }],
      },
    ]);
  });
});

// A port standing in for the worker: records what the client sends and lets
// the test send replies back in any order.
function fakePort() {
  const sent: SpellRequest[] = [];
  const port: SpellPort = {
    postMessage: (message) => sent.push(message),
    onmessage: null,
  };
  const reply = (data: SpellReply) =>
    port.onmessage?.(new MessageEvent("message", { data }));
  return { port, sent, reply };
}

describe("spell client (in the editor)", () => {
  it("doesn't start the worker until it's first used", () => {
    const { port } = fakePort();
    const connect = vi.fn(() => port);
    const client = createSpellClient(connect);
    expect(connect).not.toHaveBeenCalled();
    client.warm();
    client.warm();
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("warm() asks the worker to load the dictionary", () => {
    const { port, sent } = fakePort();
    createSpellClient(() => port).warm();
    expect(sent).toEqual([{ type: "load" }]);
  });

  it("sends a check with a new version for each request on a block", () => {
    const { port, sent } = fakePort();
    const client = createSpellClient(() => port);
    void client.check("b1", "teh", { skip: [[0, 1]], ignore: ["x"] });
    void client.check("b1", "the");
    void client.check("b2", "laet");
    expect(sent).toEqual([
      {
        type: "check",
        block: "b1",
        version: 1,
        text: "teh",
        skip: [[0, 1]],
        ignore: ["x"],
      },
      {
        type: "check",
        block: "b1",
        version: 2,
        text: "the",
        skip: [],
        ignore: [],
      },
      {
        type: "check",
        block: "b2",
        version: 1,
        text: "laet",
        skip: [],
        ignore: [],
      },
    ]);
  });

  it("resolves a check with the worker's misspellings", async () => {
    const { port, reply } = fakePort();
    const client = createSpellClient(() => port);
    const result = client.check("b1", "teh");
    const misspellings = [{ from: 0, to: 3, word: "teh" }];
    reply({ type: "checked", block: "b1", version: 1, misspellings });
    await expect(result).resolves.toEqual(misspellings);
  });

  it("uses only the latest check of a block when replies arrive out of order", async () => {
    const { port, reply } = fakePort();
    const client = createSpellClient(() => port);
    const first = client.check("b1", "teh");
    const second = client.check("b1", "teh laet");
    const latest = [
      { from: 0, to: 3, word: "teh" },
      { from: 4, to: 8, word: "laet" },
    ];
    reply({ type: "checked", block: "b1", version: 2, misspellings: latest });
    reply({
      type: "checked",
      block: "b1",
      version: 1,
      misspellings: [{ from: 0, to: 3, word: "teh" }],
    });
    await expect(second).resolves.toEqual(latest);
    await expect(first).resolves.toBeNull();
  });

  it("drops an older reply that arrives in order, once a newer check was sent", async () => {
    const { port, reply } = fakePort();
    const client = createSpellClient(() => port);
    const first = client.check("b1", "teh");
    const second = client.check("b1", "the");
    reply({
      type: "checked",
      block: "b1",
      version: 1,
      misspellings: [{ from: 0, to: 3, word: "teh" }],
    });
    reply({ type: "checked", block: "b1", version: 2, misspellings: [] });
    await expect(first).resolves.toBeNull();
    await expect(second).resolves.toEqual([]);
  });

  it("keeps the versions of different blocks apart", async () => {
    const { port, reply } = fakePort();
    const client = createSpellClient(() => port);
    const a = client.check("b1", "teh");
    const b = client.check("b2", "laet");
    reply({ type: "checked", block: "b2", version: 1, misspellings: [] });
    reply({ type: "checked", block: "b1", version: 1, misspellings: [] });
    await expect(a).resolves.toEqual([]);
    await expect(b).resolves.toEqual([]);
  });

  it("matches suggestion replies to their requests", async () => {
    const { port, sent, reply } = fakePort();
    const client = createSpellClient(() => port);
    const a = client.suggest("teh");
    const b = client.suggest("laet");
    const [ida, idb] = sent.map((m) => (m.type === "suggest" ? m.id : -1));
    expect(ida).not.toBe(idb);
    reply({ type: "suggestions", id: idb, suggestions: ["late"] });
    reply({ type: "suggestions", id: ida, suggestions: ["the", "ten"] });
    await expect(a).resolves.toEqual(["the", "ten"]);
    await expect(b).resolves.toEqual(["late"]);
  });
});

describe("dictionary files", () => {
  it("are served from our own origin", () => {
    for (const url of Object.values(DICTIONARY_FILES)) {
      expect(url).toMatch(/^\/dictionaries\//);
    }
  });

  it("served copies match the installed dictionary-en package", () => {
    for (const [ext, url] of Object.entries(DICTIONARY_FILES)) {
      const served = readFileSync(`public${url}`);
      const installed = readFileSync(`node_modules/dictionary-en/index.${ext}`);
      expect(served.equals(installed), url).toBe(true);
    }
  });
});
