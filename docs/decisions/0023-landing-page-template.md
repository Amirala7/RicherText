# 0023 — Landing page template

- Status: accepted
- Date: 2026-10-20

## Context
After the hero (ADR 0021), the full landing page was designed in three rounds (https://claude.ai/artifact/UbEKNBkgq8ZgL1FASXuMsY). Its job: turn a visitor into a subscriber, with Start free as the second way in (ADR 0020).

## Options considered
- **"Left out, on purpose"** (struck-through list of what the product doesn't do): on message, but dropped by the user in favour of social proof.
- **Feature cards with a static shortcut row** (v1) vs **cards with a short animated demo** (v2, chosen): the demos show the product working.

## Decision
Order: sticky glass pill header · hero C · Features · Reviews · Pricing (Free, Yearly, Monthly) · FAQ · closing call to action · minimal footer. New landing-only elements, approved by the user:
- **Landing section**: centred head (3xl title + lg muted line, gap 24), head to content 32, sides 48, 96 between sections; phone 16 / 24 / 24 / 64.
- **Feature card**: a 196px demo stage (subtle fill, r-md) above the title and a muted line; bento grid (wide cards span two columns), two across on tablet, one on phone. Demos loop only while on screen and show their finished state under reduced motion: formatting, ⌘K link, autosave, paste across apps, export formats, fonts × themes.
- **Review card**: stars + Google mark row (`h-sm`), quote, 36px portrait beside a 36px two-line name.
- **FAQ list**: native disclosure rows in a bordered list, each at least `h-lg`.
- **Closing call to action**: section head + the hero's buttons and price note.
- **Pricing**: three equal-height cards; Yearly carries the Save chip and the only primary button; same order on phone.
- **Colour exception**: third-party logos, review stars and file-type labels keep their own colours (landing only).

## Consequences
- Reviews and portraits (Pexels) are demo placeholders. Before launch: real reviews with permission, or the section comes out. Made-up reviews can't be presented as real, and the Pexels licence doesn't allow identifiable people to appear to endorse a product.
- The real page uses each brand's official logo assets.
- Specs live in `docs/DESIGN.md` §5.
