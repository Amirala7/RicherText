"use client";

import { Menu as MenuIcon } from "lucide-react";
import NextLink from "next/link";
import { useEffect, useRef, useState } from "react";
import { buttonVariants } from "@/components/atoms/button";
import {
  menuContent,
  menuItem,
  menuSeparator,
} from "@/components/molecules/menu";
import { refract } from "@/lib/landing/glass";
import { cn } from "@/lib/utils";

// Pill header (ADR 0021, DESIGN.md §4): floating, centred, glass, sticky.
// Wide: icon tile, section links, Sign in, Subscribe. Phone: icon tile,
// Subscribe and a menu button. The link of the section on screen is current.
const SECTIONS = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function PillHeader() {
  const pillRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => refract(pillRef.current!, 22), []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) setCurrent(`#${e.target.id}`);
        }),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const id of ["top", "features", "pricing", "faq"]) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      if (e.type === "click" && menuRef.current?.contains(e.target as Node))
        return;
      setOpen(false);
    };
    window.addEventListener("click", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <header className="lp-pillbar">
      <div className="lp-pillbar-in">
        <nav ref={pillRef} className="lp-pill lp-glass" aria-label="Site">
          <a className="lp-tile" href="#top" aria-label="RicherText, home">
            <span>
              R<i>T</i>
            </span>
          </a>
          {SECTIONS.map((s) => (
            <a
              key={s.href}
              className="lp-navlink lp-only-wide"
              href={s.href}
              aria-current={current === s.href ? "true" : undefined}
            >
              {s.label}
            </a>
          ))}
          <NextLink className="lp-navlink lp-only-wide" href="/sign-in">
            Sign in
          </NextLink>
          <a
            className={cn(buttonVariants({ size: "sm" }), "lp-btn-pill")}
            href="#pricing"
          >
            Subscribe
          </a>
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm", icon: true }),
              "lp-only-phone rounded-full",
            )}
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="lp-menu"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((o) => !o);
            }}
          >
            <MenuIcon className="size-[18px]" strokeWidth={1.75} aria-hidden />
          </button>
        </nav>
        <div
          ref={menuRef}
          id="lp-menu"
          role="menu"
          hidden={!open}
          className={cn(menuContent, "lp-menu")}
          onClick={() => setOpen(false)}
        >
          {SECTIONS.map((s) => (
            <a
              key={s.href}
              role="menuitem"
              className={cn(menuItem, "hover:bg-secondary")}
              href={s.href}
            >
              {s.label}
            </a>
          ))}
          <div className={menuSeparator} role="separator" />
          <NextLink
            role="menuitem"
            className={cn(menuItem, "hover:bg-secondary")}
            href="/sign-in"
          >
            Sign in
          </NextLink>
          <NextLink
            role="menuitem"
            className={cn(menuItem, "hover:bg-secondary")}
            href="/sign-up"
          >
            Start free
          </NextLink>
        </div>
      </div>
    </header>
  );
}
