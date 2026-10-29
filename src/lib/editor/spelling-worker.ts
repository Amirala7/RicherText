// Spell check worker (ADR 0036): the messages between the editor and the
// Web Worker that holds the dictionary. The service runs inside the worker
// (`spelling.worker.ts`); the client runs in the editor and starts the worker
// on first use. No document text leaves the device.
import {
  findMisspellings,
  suggestionsFor,
  type Misspelling,
  type SpellDictionary,
} from "./spelling";

type Range = readonly [number, number];

export type SpellRequest =
  | { type: "load" }
  | {
      type: "check";
      block: string;
      version: number;
      text: string;
      skip: Range[];
      ignore: string[];
    }
  | { type: "suggest"; id: number; word: string };

export type SpellReply =
  | {
      type: "checked";
      block: string;
      version: number;
      misspellings: Misspelling[];
    }
  | { type: "suggestions"; id: number; suggestions: string[] };

export type SpellPort = {
  postMessage(message: SpellRequest): void;
  onmessage: ((event: MessageEvent<SpellReply>) => void) | null;
};

// dictionary-en (en_US), copied into `public/` so it comes from our own
// origin; a test keeps the copies equal to the installed package.
export const DICTIONARY_FILES = {
  aff: "/dictionaries/en-US/index.aff",
  dic: "/dictionaries/en-US/index.dic",
} as const;

// Inside the worker. The dictionary loads on the first request, once; if it
// fails (offline before it was ever cached) the request finds nothing and
// the next one tries again.
export function createSpellService(
  load: () => Promise<SpellDictionary>,
  reply: (message: SpellReply) => void,
) {
  let dict: Promise<SpellDictionary> | null = null;
  const dictionary = () => {
    dict ??= load().catch((error: unknown) => {
      dict = null;
      throw error;
    });
    return dict;
  };

  return async (request: SpellRequest) => {
    const loaded = await dictionary().catch(() => null);
    if (request.type === "check") {
      const { block, version, text, skip, ignore } = request;
      reply({
        type: "checked",
        block,
        version,
        misspellings: loaded
          ? findMisspellings(text, {
              dict: loaded,
              ignore: new Set(ignore),
              skip,
            })
          : [],
      });
    } else if (request.type === "suggest") {
      reply({
        type: "suggestions",
        id: request.id,
        suggestions: loaded ? suggestionsFor(request.word, loaded) : [],
      });
    }
  };
}

// In the editor. Each check on a block gets a new version; a reply is used
// only if it answers the latest check of its block, otherwise it resolves
// to null and the caller ignores it.
export function createSpellClient(connect: () => SpellPort) {
  let port: SpellPort | null = null;
  const latest = new Map<string, number>();
  const checks = new Map<string, (m: Misspelling[] | null) => void>();
  const suggestions = new Map<number, (s: string[]) => void>();
  let nextId = 1;

  const send = (message: SpellRequest) => {
    if (!port) {
      port = connect();
      port.onmessage = ({ data }) => receive(data);
    }
    port.postMessage(message);
  };

  const receive = (data: SpellReply) => {
    if (data.type === "checked") {
      const key = `${data.block}@${data.version}`;
      const resolve = checks.get(key);
      checks.delete(key);
      resolve?.(
        latest.get(data.block) === data.version ? data.misspellings : null,
      );
    } else {
      suggestions.get(data.id)?.(data.suggestions);
      suggestions.delete(data.id);
    }
  };

  return {
    // Loads the dictionary ahead of the first check (e.g. when idle).
    warm() {
      send({ type: "load" });
    },
    check(
      block: string,
      text: string,
      options: { skip?: Range[]; ignore?: string[] } = {},
    ) {
      const version = (latest.get(block) ?? 0) + 1;
      latest.set(block, version);
      const result = new Promise<Misspelling[] | null>((resolve) =>
        checks.set(`${block}@${version}`, resolve),
      );
      send({
        type: "check",
        block,
        version,
        text,
        skip: options.skip ?? [],
        ignore: options.ignore ?? [],
      });
      return result;
    },
    suggest(word: string) {
      const id = nextId++;
      const result = new Promise<string[]>((resolve) =>
        suggestions.set(id, resolve),
      );
      send({ type: "suggest", id, word });
      return result;
    },
  };
}

export type SpellClient = ReturnType<typeof createSpellClient>;

export function spellWorker(): SpellPort {
  return new Worker(new URL("./spelling.worker.ts", import.meta.url), {
    type: "module",
  });
}
