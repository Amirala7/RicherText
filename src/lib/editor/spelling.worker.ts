// The spell check Web Worker (ADR 0036): loads nspell + dictionary-en from our
// own origin on the first request and answers the editor's messages.
import nspell from "nspell";
import {
  createSpellService,
  DICTIONARY_FILES,
  type SpellReply,
  type SpellRequest,
} from "./spelling-worker";

async function text(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Dictionary ${response.status}`);
  return response.text();
}

const handle = createSpellService(
  async () => {
    const [aff, dic] = await Promise.all([
      text(DICTIONARY_FILES.aff),
      text(DICTIONARY_FILES.dic),
    ]);
    return nspell(aff, dic);
  },
  (message: SpellReply) => self.postMessage(message),
);

self.onmessage = (event: MessageEvent<SpellRequest>) => {
  void handle(event.data);
};
