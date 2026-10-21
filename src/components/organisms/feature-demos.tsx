"use client";

import { ArrowRight, Check, Link as LinkIcon, Text } from "lucide-react";
import { useEffect, useRef } from "react";
import {
  GmailMark,
  GoogleDocsMark,
  OutlookMark,
  WordMark,
} from "@/components/atoms/brand-marks";

// Feature card demos (ADR 0023, DESIGN.md §5): each loops only while on
// screen; under reduced motion each shows its finished state. They're
// decorative (aria-hidden); the card's title and line carry the meaning.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const $ = <T extends Element = HTMLElement>(sel: string, el: Element) =>
  el.querySelector<T>(sel)!;

/** Runs `run` in a loop while the stage is on screen, until unmounted. */
function useDemo(
  run: (el: HTMLElement, alive: () => boolean) => Promise<void>,
  still: (el: HTMLElement) => void,
) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current!;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      still(el);
      return;
    }
    let alive = true;
    let onScreen = false;
    const observer = new IntersectionObserver(
      (es) => es.forEach((e) => (onScreen = e.isIntersecting)),
      { threshold: 0.2 },
    );
    observer.observe(el);
    void (async () => {
      while (alive) {
        while (alive && !onScreen) await sleep(300);
        if (alive) await run(el, () => alive);
      }
    })();
    return () => {
      alive = false;
      observer.disconnect();
    };
    // The demos are fixed scripts; they never change after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ref;
}

function Keys({ className }: { className?: string }) {
  return <div className={className ?? "lp-kread"} />;
}
const showKeys = (el: HTMLElement, keys: string[]) => {
  $(".lp-kread", el).innerHTML = keys
    .map((k) => `<span class="lp-kbd">${k}</span>`)
    .join("");
};

export function FormatDemo() {
  const ref = useDemo(
    async (el) => {
      const doc = el;
      doc.dataset.step = "0";
      showKeys(el, []);
      await sleep(1200);
      const steps = [
        ["⌘", "⌥", "1"],
        ["⌘", "B"],
        ["⌘", "⇧", "8"],
        ["⌘", "⇧", "B"],
      ];
      for (const [i, keys] of steps.entries()) {
        showKeys(el, keys);
        await sleep(350);
        doc.dataset.step = String(i + 1);
        await sleep(1100);
      }
      showKeys(el, []);
      await sleep(2600);
    },
    (el) => (el.dataset.step = "4"),
  );
  return (
    <div
      ref={ref}
      className="lp-stage"
      data-demo="format"
      data-step="0"
      aria-hidden="true"
    >
      <Keys />
      <div className="lp-mdoc">
        <p className="m-h">Meeting notes</p>
        <p>
          Send the <span className="m-b">final</span> draft by Friday.
        </p>
        <ul className="m-l">
          <li>Confirm the budget</li>
          <li>Book the review call</li>
        </ul>
        <p className="m-q">Short beats long.</p>
      </div>
    </div>
  );
}

export function LinkDemo() {
  const ref = useDemo(
    async (el, alive) => {
      const lk = $(".lp-lk", el);
      const pop = $(".lp-lpop", el);
      const url = $(".url", el);
      lk.className = "lp-lk";
      lk.dataset.linked = "false";
      pop.classList.remove("open");
      url.textContent = "";
      showKeys(el, []);
      await sleep(1000);
      lk.classList.add("sel");
      await sleep(700);
      showKeys(el, ["⌘", "K"]);
      pop.classList.add("open");
      await sleep(500);
      for (const c of "richertext.app/q3-plan") {
        if (!alive()) return;
        url.textContent += c;
        await sleep(45 + Math.random() * 40);
      }
      await sleep(400);
      showKeys(el, ["↵"]);
      await sleep(300);
      pop.classList.remove("open");
      lk.classList.remove("sel");
      lk.dataset.linked = "true";
      await sleep(500);
      showKeys(el, []);
      await sleep(2400);
    },
    (el) => ($(".lp-lk", el).dataset.linked = "true"),
  );
  return (
    <div ref={ref} className="lp-stage" data-demo="link" aria-hidden="true">
      <Keys />
      <div className="lp-lsent">
        Read the{" "}
        <span className="lp-lk" data-linked="false">
          proposal
          <span className="lp-lpop">
            <LinkIcon className="lp-i" />
            <span className="url" />
          </span>
        </span>{" "}
        first.
      </div>
    </div>
  );
}

const SAVE_LINES = [
  "Thanks for the call today. Here are the next steps.",
  "The draft is ready for your review on Friday.",
  "Short version: we ship the editor first.",
];

export function SaveDemo() {
  const ref = useDemo(
    async (el, alive) => {
      const tx = $(".tx", el);
      const ok = $("[data-saved=ok]", el);
      const ing = $("[data-saved=ing]", el);
      const set = (saving: boolean) => {
        ok.classList.toggle("on", !saving);
        ing.classList.toggle("on", saving);
      };
      const n = Number(el.dataset.n ?? 0);
      el.dataset.n = String(n + 1);
      tx.textContent = "";
      set(false);
      await sleep(900);
      set(true);
      for (const c of SAVE_LINES[n % SAVE_LINES.length]) {
        if (!alive()) return;
        tx.textContent += c;
        await sleep(40 + Math.random() * 50);
      }
      await sleep(700);
      set(false);
      await sleep(2400);
    },
    (el) => ($(".tx", el).textContent = SAVE_LINES[0]),
  );
  return (
    <div
      ref={ref}
      className="lp-stage save"
      data-demo="save"
      aria-hidden="true"
    >
      <div className="lp-sbar">
        <span className="doc-t">Client memo</span>
        <span className="lp-saved">
          <span data-saved="ok" className="on">
            <Check className="lp-i size-3.5" />
            Saved
          </span>
          <span data-saved="ing">
            <span className="lp-spin" />
            Saving
          </span>
        </span>
      </div>
      <div className="lp-swrite">
        <span className="tx" />
        <span className="lp-caret" />
      </div>
    </div>
  );
}

const APPS = {
  gdocs: ["Google Docs", GoogleDocsMark],
  word: ["Word", WordMark],
  gmail: ["Gmail", GmailMark],
  outlook: ["Outlook", OutlookMark],
} as const;
type AppKey = keyof typeof APPS;
const PAIRS: [AppKey, AppKey][] = [
  ["gdocs", "word"],
  ["word", "gmail"],
  ["outlook", "gdocs"],
  ["gdocs", "outlook"],
];

function AppTile({ side, shown }: { side: "src" | "dst"; shown: AppKey }) {
  return (
    <div className="lp-app" data-side={side}>
      <div className="lg">
        {(Object.keys(APPS) as AppKey[]).map((key) => {
          const Mark = APPS[key][1];
          return (
            <Mark
              key={key}
              data-app={key}
              className={key === shown ? undefined : "off"}
            />
          );
        })}
      </div>
      <span className="nm">{APPS[shown][0]}</span>
    </div>
  );
}

const setApp = (el: HTMLElement, side: string, key: AppKey) => {
  const app = $(`[data-side=${side}]`, el);
  app
    .querySelectorAll("svg")
    .forEach((svg) => svg.classList.toggle("off", svg.dataset.app !== key));
  $(".nm", app).textContent = APPS[key][0];
};

export function PasteDemo() {
  const ref = useDemo(
    async (el) => {
      const src = $("[data-side=src]", el);
      const dst = $("[data-side=dst]", el);
      const rt = $("[data-side=rt]", el);
      const pk = $(".lp-packet", el);
      const [a1, a2] = el.querySelectorAll(".lp-arr");
      const n = Number(el.dataset.n ?? 0);
      el.dataset.n = String(n + 1);
      const [s, d] = PAIRS[n % PAIRS.length];
      setApp(el, "src", s);
      setApp(el, "dst", d);
      const at = (app: HTMLElement) =>
        `translateX(${app.offsetLeft + app.offsetWidth / 2 - 12}px)`;
      pk.style.transition = "none";
      pk.style.transform = at(src);
      pk.style.opacity = "0";
      await sleep(700);
      pk.style.transition = "";
      showKeys(el, ["⌘", "C"]);
      pk.style.opacity = "1";
      await sleep(500);
      showKeys(el, ["⌘", "V"]);
      a1.classList.add("hot");
      pk.style.transform = at(rt);
      await sleep(900);
      a1.classList.remove("hot");
      showKeys(el, ["⌘", "C"]);
      await sleep(500);
      showKeys(el, ["⌘", "V"]);
      a2.classList.add("hot");
      pk.style.transform = at(dst);
      await sleep(900);
      a2.classList.remove("hot");
      pk.style.opacity = "0";
      showKeys(el, []);
      await sleep(1400);
    },
    (el) => {
      setApp(el, "src", "gdocs");
      setApp(el, "dst", "word");
    },
  );
  return (
    <div
      ref={ref}
      className="lp-stage paste"
      data-demo="paste"
      aria-hidden="true"
    >
      <Keys />
      <div className="lp-prow">
        <AppTile side="src" shown="gdocs" />
        <ArrowRight className="lp-i lp-arr" />
        <div className="lp-app" data-side="rt">
          <div className="lg">
            <span className="lp-tile square">
              <span>
                R<i>T</i>
              </span>
            </span>
          </div>
          <span className="nm">RicherText</span>
        </div>
        <ArrowRight className="lp-i lp-arr" />
        <AppTile side="dst" shown="word" />
        <span className="lp-packet">
          <Text className="lp-i" />
        </span>
      </div>
      <div className="lp-pkept">
        <Check className="lp-i" />
        <span>
          Headings, <b>bold</b>, <i>italic</i>, <u>links</u> and lists kept
        </span>
      </div>
    </div>
  );
}

const FORMATS = [
  ["PDF", "#E5322D"],
  ["DOCX", "#185ABD"],
  ["RTF", "#6B5FA8"],
  ["MD", "#3D3A4A"],
  ["HTML", "#E0662B"],
  ["TXT", "#6E6A7C"],
];

function FileIcon({
  tag,
  colour,
  src,
}: {
  tag: string;
  colour: string;
  src?: boolean;
}) {
  return (
    <div className={src ? "lp-file src" : "lp-file"}>
      <svg viewBox="0 0 44 54">
        <path
          style={{ fill: "var(--background)", stroke: "var(--border-strong)" }}
          d="M5 .5h24l14.5 14.5v34a4.5 4.5 0 0 1-4.5 4.5H5A4.5 4.5 0 0 1 .5 49V5A4.5 4.5 0 0 1 5 .5z"
        />
        <path
          style={{ fill: "var(--secondary)", stroke: "var(--border-strong)" }}
          d="M29 .5V11a4 4 0 0 0 4 4h10.5"
        />
        <rect
          x="8"
          y="20"
          width="22"
          height="2"
          rx="1"
          style={{ fill: "var(--border-strong)" }}
        />
        <rect
          x="8"
          y="25"
          width="28"
          height="2"
          rx="1"
          style={{ fill: "var(--border-strong)" }}
        />
        <rect
          x="8"
          y="30"
          width="18"
          height="2"
          rx="1"
          style={{ fill: "var(--border-strong)" }}
        />
      </svg>
      <span className="tag" style={{ "--c": colour } as React.CSSProperties}>
        {tag}
      </span>
    </div>
  );
}

export function ExportDemo() {
  const ref = useDemo(
    async (el, alive) => {
      for (const f of el.querySelectorAll(".lp-files .lp-file")) {
        if (!alive()) return;
        f.classList.add("hot");
        await sleep(650);
        f.classList.remove("hot");
      }
      await sleep(900);
    },
    () => {},
  );
  return (
    <div
      ref={ref}
      className="lp-stage export"
      data-demo="export"
      aria-hidden="true"
    >
      <FileIcon tag="RT" colour="#0F0F14" src />
      <ArrowRight className="lp-i lp-arr size-5" />
      <div className="lp-files">
        {FORMATS.map(([tag, colour]) => (
          <FileIcon key={tag} tag={tag} colour={colour} />
        ))}
      </div>
    </div>
  );
}

export function FontDemo() {
  const ref = useDemo(
    async (el) => {
      await sleep(1800);
      const mini = $(".lp-mini", el);
      const step = (Number(el.dataset.n ?? 0) + 1) % 4;
      el.dataset.n = String(step);
      const serif = step % 2 === 1;
      const dark = step >= 2;
      mini.dataset.font = serif ? "serif" : "sans";
      mini.dataset.theme = dark ? "dark" : "light";
      $(".lp-fontlbl", el).textContent =
        `${serif ? "IBM Plex Serif" : "Geist"} · ${dark ? "Dark" : "Light"}`;
    },
    () => {},
  );
  return (
    <div ref={ref} className="lp-stage" data-demo="font" aria-hidden="true">
      <div className="lp-mini" data-font="sans" data-theme="light">
        <span className="big">Aa</span>
        <span className="ln">The draft reads well in any light.</span>
      </div>
      <span className="lp-fontlbl">Geist · Light</span>
    </div>
  );
}
