"use client";

import {
  Bold,
  Check,
  Heading1,
  Heading2,
  Italic,
  Link,
  Strikethrough,
  Underline,
  type LucideIcon,
} from "lucide-react";
import NextLink from "next/link";
import { useEffect, useRef } from "react";
import { buttonVariants } from "@/components/atoms/button";
import { refract } from "@/lib/landing/glass";
import {
  HEADLINE,
  KEY_ROWS,
  ROTATION,
  charKeys,
  charsToLine,
  codeToKeyId,
  lineToChars,
  rememberLine,
  renderChars,
  type Line,
  type Mark,
  type TypedChar,
} from "@/lib/landing/typing";
import { cn } from "@/lib/utils";

// Hero, variant C (ADR 0021, DESIGN.md §4): static logo; the keyboard types
// the line and the glass toolbar reflects the formatting. Visitor typing takes
// over and joins the rotation (last 3). Reduced motion: headline only.
// The markup is complete on the server; the script only animates it.
const TOOLS: (LucideIcon | "|")[] = [
  Heading1,
  Heading2,
  "|",
  Bold,
  Italic,
  Underline,
  Strikethrough,
  "|",
  Link,
];
const CMDS = ["h1", "h2", "", "b", "i", "u", "s", "", "link"];

const BENEFITS = [
  "Opens in under a second",
  "Saves every keystroke",
  "Pastes cleanly into email, Docs and Word",
];

export function HeroActions() {
  return (
    <div className="lp-cta">
      <NextLink href="#pricing" className={cn(buttonVariants({ size: "lg" }))}>
        Subscribe
      </NextLink>
      <NextLink
        href="/sign-up"
        className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
      >
        Start free
      </NextLink>
    </div>
  );
}

export function LandingHero({ priceNote }: { priceNote: string }) {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => startHero(heroRef.current!), []);

  return (
    <div className="lp-hero-wrap" id="top">
      <section ref={heroRef} className="lp-hero">
        <h1 className="sr-only">RicherText: {HEADLINE}</h1>
        <div className="lp-biglogo" data-hero="logo" aria-hidden="true">
          <span className="w">
            Richer<span>Text</span>
          </span>
        </div>
        <div className="lp-typed" data-hero="typed" aria-hidden="true">
          <div className="line">
            <span className="txt">{HEADLINE}</span>
            <span className="lp-caret" />
          </div>
        </div>
        <p className="lp-sub lp-trim">
          A fast, focused editor for the memos, proposals and notes you write
          every day. Formatting pastes cleanly into email, Docs and Word.
        </p>
        <HeroActions />
        <p className="lp-note lp-trim">{priceNote}</p>
        <ul className="lp-feats">
          {BENEFITS.map((b) => (
            <li key={b}>
              <Check strokeWidth={1.75} aria-hidden />
              <span className="lp-trim">{b}</span>
            </li>
          ))}
        </ul>
        <div className="lp-tbwrap" data-hero="toolbar" aria-hidden="true">
          <div className="lp-tb lp-glass">
            <span className="lp-lens" />
            {TOOLS.map((Icon, i) =>
              Icon === "|" ? (
                <span key={i} className="div" />
              ) : (
                <span
                  key={i}
                  className="lp-tg"
                  data-cmd={CMDS[i]}
                  data-clickable={"biu".includes(CMDS[i]) || undefined}
                >
                  <Icon strokeWidth={1.75} />
                </span>
              ),
            )}
          </div>
        </div>
        <div className="lp-kb-stage" data-hero="keyboard" aria-hidden="true">
          <div className="lp-kb">
            {KEY_ROWS.map((row, r) => (
              <div key={r} className="lp-krow">
                {row.map((k) => (
                  <div
                    key={k.id}
                    data-id={k.id}
                    className={cn(
                      "lp-key",
                      k.mod && "mod",
                      k.centred && "c",
                      k.accent && "accent",
                    )}
                    style={
                      k.width
                        ? ({ "--w": k.width } as React.CSSProperties)
                        : undefined
                    }
                  >
                    {/^[a-z]$/.test(k.label) ? k.label.toUpperCase() : k.label}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------- animation (imperative, ported from the approved prototype) ---------- */

function startHero(hero: HTMLElement): () => void {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let alive = true;
  const cleanups: (() => void)[] = [];
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const listen = <K extends keyof WindowEventMap>(
    type: K,
    fn: (e: WindowEventMap[K]) => void,
  ) => {
    window.addEventListener(type, fn);
    cleanups.push(() => window.removeEventListener(type, fn));
  };

  const typedEl = hero.querySelector<HTMLElement>("[data-hero=typed]")!;
  const txt = typedEl.querySelector<HTMLElement>(".txt")!;
  const lineEl = txt.parentElement!;
  const tbEl = hero.querySelector<HTMLElement>(".lp-tb")!;
  const lens = tbEl.querySelector<HTMLElement>(".lp-lens")!;
  const stage = hero.querySelector<HTMLElement>(".lp-kb-stage")!;
  const kbEl = stage.querySelector<HTMLElement>(".lp-kb")!;
  const keys: Record<string, HTMLElement> = {};
  kbEl
    .querySelectorAll<HTMLElement>(".lp-key")
    .forEach((k) => (keys[k.dataset.id!] = k));
  const btns: Record<string, HTMLElement> = {};
  tbEl
    .querySelectorAll<HTMLElement>(".lp-tg")
    .forEach((b) => (btns[b.dataset.cmd!] = b));

  /* keyboard */
  const keyDown = (id: string) => keys[id]?.classList.add("down");
  const keyUp = (id: string) => keys[id]?.classList.remove("down");
  const releaseAll = () =>
    Object.values(keys).forEach((k) => k.classList.remove("down"));
  const tap = async (ids: string[], hold = 95) => {
    if (reduce) return;
    ids.forEach(keyDown);
    await sleep(hold);
    ids.forEach(keyUp);
  };

  /* toolbar */
  let lensOn = "b";
  const moveLens = (cmd: string) => {
    const b = btns[cmd];
    if (!b) return;
    Object.values(btns).forEach((x) => x.classList.remove("lensed"));
    b.classList.add("lensed");
    lensOn = cmd;
    lens.style.transform = `translateX(${b.offsetLeft}px)`;
  };
  const press = async (cmd: string) => {
    const b = btns[cmd];
    if (!b) return;
    moveLens(cmd);
    if (reduce) return;
    b.classList.add("press");
    await sleep(140);
    b.classList.remove("press");
  };
  const syncTb = (m: Mark) => {
    for (const k of ["b", "i", "u"]) btns[k].classList.toggle("on", m === k);
  };
  requestAnimationFrame(() => moveLens(lensOn));
  const tbObserver = new ResizeObserver(() => moveLens(lensOn));
  tbObserver.observe(tbEl);
  cleanups.push(() => tbObserver.disconnect());

  /* typed line */
  let chars: TypedChar[] = lineToChars([[HEADLINE, ""]]);
  let mark: Mark = "";
  let user = false;
  let userMark: Mark = "";
  let gen = 0;
  let extra: Line[] = [];
  let userTimer: ReturnType<typeof setTimeout> | undefined;
  const lines = (): Line[] => [[[HEADLINE, ""]], ...ROTATION, ...extra];

  const render = () => {
    txt.innerHTML = renderChars(chars);
    // A visitor's long line scrolls: drop characters from the start.
    while (user && chars.length && lineEl.offsetWidth > typedEl.clientWidth) {
      chars = chars.slice(1);
      txt.innerHTML = renderChars(chars);
    }
  };
  const wait = async (ms: number, g: number) => {
    await sleep(ms);
    return alive && gen === g;
  };
  const toggleMark = async (to: Mark, g: number) => {
    const steps = [
      mark && mark !== to ? mark : null,
      to && to !== mark ? to : null,
    ];
    for (const m of steps) {
      if (!m) continue;
      void tap(["cmdl", m], 140);
      await press(m);
      mark = m === mark ? "" : m;
      syncTb(mark);
      if (!(await wait(260, g))) return false;
    }
    return true;
  };
  const type = async (line: Line, g: number) => {
    typedEl.classList.add("typing");
    for (const [t, m] of line) {
      if (m !== mark && !(await toggleMark(m, g))) return false;
      for (const c of t) {
        chars = [...chars, { c, m }];
        render();
        void tap(charKeys(c));
        const delay = 55 + Math.random() * 70 + (c === " " ? 40 : 0);
        if (!(await wait(delay, g))) return false;
      }
    }
    if (mark && !(await toggleMark("", g))) return false;
    typedEl.classList.remove("typing");
    return true;
  };
  const erase = async (g: number) => {
    void tap(["cmdl", "a"], 140);
    txt.classList.add("allsel");
    if (!(await wait(520, g))) {
      txt.classList.remove("allsel");
      return false;
    }
    void tap(["delete"]);
    txt.classList.remove("allsel");
    chars = [];
    render();
    return wait(380, g);
  };
  const loop = async () => {
    let idx = 0;
    while (alive) {
      const g = gen;
      const n = lines().length;
      const ok =
        (await wait(idx === 0 ? 3200 : 2200, g)) &&
        (await erase(g)) &&
        (await type(lines()[(idx + 1) % n], g));
      if (ok) {
        idx = (idx + 1) % n;
        continue;
      }
      if (!alive) return;
      typedEl.classList.remove("typing");
      txt.classList.remove("allsel");
      mark = "";
      syncTb("");
      while (user && alive) await sleep(200);
      // The visitor's line joins the queue: it rests, is erased like the
      // others, and comes back later.
      const line = charsToLine(chars);
      if (line) {
        extra = rememberLine(extra, line);
        const key = JSON.stringify(line);
        idx = lines().findIndex((l) => JSON.stringify(l) === key);
      } else idx = lines().length - 1;
    }
  };
  const enterUser = () => {
    if (!user) {
      user = true;
      gen++;
      chars = [];
      userMark = "";
      syncTb("");
      typedEl.classList.remove("typing");
      txt.classList.remove("allsel");
    }
    clearTimeout(userTimer);
    userTimer = setTimeout(() => {
      user = false;
      gen++;
    }, 2000);
  };
  const userType = (c: string) => {
    enterUser();
    chars = [...chars, { c, m: userMark }];
    render();
  };
  const userBack = () => {
    enterUser();
    chars = chars.slice(0, -1);
    render();
  };
  const userToggle = (m: Mark) => {
    enterUser();
    userMark = userMark === m ? "" : m;
    void press(m);
    syncTb(userMark);
  };
  cleanups.push(() => clearTimeout(userTimer));

  /* keyboard clicks, toolbar clicks */
  const onKeyPointer = (e: PointerEvent) => {
    const k = (e.target as HTMLElement).closest<HTMLElement>(".lp-key");
    if (!k) return;
    e.preventDefault();
    const id = k.dataset.id!;
    void tap([id]);
    if (id === "delete") userBack();
    else if (id === "space") userType(" ");
    else if (id.length === 1) userType(id);
  };
  kbEl.addEventListener("pointerdown", onKeyPointer);
  cleanups.push(() => kbEl.removeEventListener("pointerdown", onKeyPointer));
  const onTbClick = (e: MouseEvent) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>(".lp-tg");
    const cmd = b?.dataset.cmd;
    if (cmd === "b" || cmd === "i" || cmd === "u") userToggle(cmd);
  };
  tbEl.addEventListener("click", onTbClick);
  cleanups.push(() => tbEl.removeEventListener("click", onTbClick));

  /* the tilted keyboard's visible top sits below its box: pull it up so the
     gap to the toolbar matches every other gap */
  const fit = () => {
    stage.style.marginTop = "0px";
    const d =
      kbEl.getBoundingClientRect().top - stage.getBoundingClientRect().top;
    stage.style.marginTop = `${-d}px`;
  };
  const stageObserver = new ResizeObserver(() => requestAnimationFrame(fit));
  stageObserver.observe(stage);
  cleanups.push(() => stageObserver.disconnect());

  cleanups.push(refract(tbEl, 18));

  /* visitor typing: only while the hero is in view, never while a control has focus */
  const visible = () => {
    const r = hero.getBoundingClientRect();
    const shown = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
    return shown / Math.min(r.height, innerHeight) > 0.35;
  };
  const busy = (t: EventTarget | null) =>
    t instanceof Element &&
    !!t.closest(
      "a, button, summary, input, textarea, select, [contenteditable]",
    );
  listen("keydown", (e) => {
    if (!visible() || busy(e.target)) return;
    const id = codeToKeyId(e.code);
    if (id) keyDown(id);
    if (e.metaKey || e.ctrlKey) {
      const k = e.key.toLowerCase();
      if (k === "b" || k === "i" || k === "u") {
        e.preventDefault();
        userToggle(k);
      }
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      userBack();
    } else if (e.key.length === 1) {
      e.preventDefault();
      userType(e.key);
    }
  });
  listen("keyup", (e) => {
    const id = codeToKeyId(e.code);
    if (id) keyUp(id);
    if (e.key === "Meta") releaseAll();
  });
  listen("blur", releaseAll);

  if (!reduce) void loop();
  typedEl.dataset.ready = "true";

  return () => {
    alive = false;
    gen++;
    cleanups.forEach((fn) => fn());
  };
}
