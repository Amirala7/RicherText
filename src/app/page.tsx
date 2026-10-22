import { Plus } from "lucide-react";
import type { Metadata } from "next";
import NextLink from "next/link";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button";
import { GoogleMark } from "@/components/atoms/brand-marks";
import {
  ExportDemo,
  FontDemo,
  FormatDemo,
  LinkDemo,
  PasteDemo,
  SaveDemo,
} from "@/components/organisms/feature-demos";
import { HeroActions, LandingHero } from "@/components/organisms/landing-hero";
import { PillHeader } from "@/components/organisms/pill-header";
import { PricingBlock } from "@/components/organisms/pricing-block";
import { SiteFooter } from "@/components/organisms/site-footer";
import { PAID_PLANS, formatUsd } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";
import "./landing.css";

// Landing page (ADR 0021, 0023, DESIGN.md §5): statically pre-rendered,
// complete HTML for search engines; the scripts only animate it. One job:
// get a visitor to subscribe, with Start free as the second way in. No
// request data is read, so the build prerenders it.

const DESCRIPTION =
  "A fast, focused rich text editor for the memos, proposals and notes you write every day. Formatting pastes cleanly into email, Google Docs and Word.";

export const metadata: Metadata = {
  title: "RicherText: Rich text, minus the clutter.",
  description: DESCRIPTION,
  openGraph: {
    title: "RicherText",
    description: DESCRIPTION,
    type: "website",
  },
};

const PRICE_NOTE = `${formatUsd(PAID_PLANS.yearly.amount)} a year or ${formatUsd(PAID_PLANS.monthly.amount)} a month. Free plan: one document, plain text.`;

function Section({
  id,
  title,
  line,
  children,
  className,
}: {
  id: string;
  title: string;
  line?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`h-${id}`}
      className={className ?? "lp-sec"}
    >
      <div className="lp-sec-head">
        <h2 id={`h-${id}`} className="lp-trim">
          {title}
        </h2>
        {line && <p className="lp-trim">{line}</p>}
      </div>
      {children}
    </section>
  );
}

const FEATURES: {
  title: string;
  line: string;
  demo: React.ReactNode;
  wide?: boolean;
  badge?: string;
}[] = [
  {
    title: "Format as fast as you think",
    line: "Headings, bold, italic, underline, lists and quotes. Each one is a shortcut you already know.",
    demo: <FormatDemo />,
    wide: true,
  },
  {
    title: "Links in a keystroke",
    line: "Select a word, press ⌘K, paste the address.",
    demo: <LinkDemo />,
  },
  {
    title: "Saves as you type",
    line: "No save button. If the connection drops, it tells you and keeps trying.",
    demo: <SaveDemo />,
  },
  {
    title: "Pastes cleanly, both ways",
    line: "Copy from Google Docs, paste into Word, Gmail or Outlook, and back again. The formatting survives the trip.",
    demo: <PasteDemo />,
    wide: true,
  },
  {
    title: "Export to your favourite format",
    line: "PDF, Word, RTF, Markdown, HTML or plain text, with the formatting intact. Coming to every subscription.",
    demo: <ExportDemo />,
    wide: true,
    // Not built yet (ADR 0022).
    badge: "Coming soon",
  },
  {
    title: "Sans or serif, light or dark",
    line: "Write in Geist or IBM Plex Serif. It's a display setting; your text stays the same.",
    demo: <FontDemo />,
  },
];

// Placeholders until launch: real reviews with permission, or the section
// comes out (ADR 0023). Portraits: Pexels 220453, 1222271, 774909.
const REVIEWS = [
  {
    quote: "I pressed the keys and the words showed up. Every single time.",
    name: "Typo Typington",
    role: "Professional typist",
  },
  {
    quote: "Bold text was bold. Italic text was italic. I checked twice.",
    name: "Guy Helvetica",
    role: "Writes things down",
  },
  {
    quote: "It saved my document. Then it saved it again. Incredible.",
    name: "Fontaine Kerning",
    role: "Spacing enthusiast",
  },
];

const FAQ = [
  [
    "Is there really a free plan?",
    "Yes. Sign up without a card and write one document at a time, in plain text. Subscribe for the full formatting toolbar and as many documents as you like.",
  ],
  [
    "Will my formatting survive when I paste?",
    "Headings, lists, bold, italic, underline, links and quotes paste into Gmail, Outlook, Google Docs and Word as formatted text. Pasting from them into RicherText keeps the same formats.",
  ],
  [
    "Could I lose what I've written?",
    "Every change saves as you type, and the indicator says when it's saved. If your connection drops, it tells you and retries.",
  ],
  [
    "What happens to my documents if I cancel?",
    "Nothing is deleted. Your most recent document stays editable and the rest become read-only until you subscribe again.",
  ],
  [
    "Does it work on my phone?",
    "Yes, in your phone's browser. There's no app to install.",
  ],
  [
    "Can I share documents or write with others?",
    "No. RicherText is for writing on your own. When a draft is ready, copy it into the email or document it's going to.",
  ],
  [
    "Can I export to Word or PDF?",
    "Not yet; it's coming soon to the paid plans: PDF, Word, RTF, Markdown, HTML or plain text, with the formatting intact. The Free plan won't include export.",
  ],
  [
    "How do I cancel?",
    "Any time, from your account page. Billing is handled by Stripe, and you keep access until the end of the period you paid for.",
  ],
];

function Star() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="lp">
      <PillHeader />
      <main>
        <LandingHero priceNote={PRICE_NOTE} />
        <div className="lp-sections">
          <Section
            id="features"
            title="The formatting you use. Nothing else."
            line="Every tool a professional reaches for daily, each one a keystroke away."
          >
            <ul className="lp-sec-body lp-fgrid">
              {FEATURES.map((f) => (
                <li
                  key={f.title}
                  className={f.wide ? "lp-fcard wide" : "lp-fcard"}
                >
                  {f.demo}
                  <div className="lp-ftxt">
                    {f.badge && (
                      <Badge tone="primary" className="self-start">
                        {f.badge}
                      </Badge>
                    )}
                    <h3>{f.title}</h3>
                    <p>{f.line}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <Section
            id="reviews"
            title="Loved by people who type."
            line="Five stars from customers who are definitely real."
          >
            <ul className="lp-sec-body lp-rgrid">
              {REVIEWS.map((r, i) => (
                <li key={r.name}>
                  <figure className="lp-rcard">
                    <div className="lp-rtop">
                      <span
                        className="lp-stars"
                        role="img"
                        aria-label="5 out of 5"
                      >
                        {[0, 1, 2, 3, 4].map((s) => (
                          <Star key={s} />
                        ))}
                      </span>
                      <GoogleMark
                        className="lp-gmark"
                        role="img"
                        aria-label="Google review"
                      />
                    </div>
                    <blockquote>“{r.quote}”</blockquote>
                    <figcaption className="lp-rby">
                      {/* eslint-disable-next-line @next/next/no-img-element -- 36px static placeholder */}
                      <img
                        className="lp-av"
                        src={`/landing/review-${i + 1}.jpg`}
                        alt=""
                        width={36}
                        height={36}
                        loading="lazy"
                      />
                      <span className="who">
                        <b>{r.name}</b>
                        <span>{r.role}</span>
                      </span>
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </Section>

          <PricingBlock
            id="pricing"
            headingLevel={2}
            free={
              <NextLink
                href="/sign-up"
                className={cn(
                  buttonVariants({ variant: "secondary", size: "lg" }),
                )}
              >
                Start free
              </NextLink>
            }
            yearly={
              <NextLink
                href="/sign-up?plan=yearly"
                className={cn(buttonVariants({ size: "lg" }))}
              >
                Subscribe yearly
              </NextLink>
            }
            monthly={
              <NextLink
                href="/sign-up?plan=monthly"
                className={cn(
                  buttonVariants({ variant: "secondary", size: "lg" }),
                )}
              >
                Subscribe monthly
              </NextLink>
            }
          />

          <Section id="faq" title="Questions">
            <div className="lp-sec-body">
              <div className="lp-faq">
                {FAQ.map(([q, a]) => (
                  <details key={q}>
                    <summary>
                      <span className="q">{q}</span>
                      <Plus
                        className="size-4 shrink-0"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                    </summary>
                    <p className="a">{a}</p>
                  </details>
                ))}
              </div>
            </div>
          </Section>

          <Section
            id="start"
            title="Your next draft starts here."
            line="Open it, write, paste it where it's going."
          >
            <div className="lp-cta-wrap">
              <HeroActions />
              <p className="lp-note lp-trim">{PRICE_NOTE}</p>
            </div>
          </Section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
