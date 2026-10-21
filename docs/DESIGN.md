# RicherText Design System

One design language for the landing page and the editor (CLAUDE.md, ADR 0007). Built atomically: **tokens → atoms → molecules → organisms → templates**. No one-off styles per surface; if a screen needs something new, it is added here first.

Decisions: ADR 0007 (rules), 0010 (Geist, violet), 0011 (tokens), 0012 (logotype, icon, loaders), 0013 (atoms, layout rules), 0015 (molecules, rule 4), 0016 (organisms), 0021 (hero), 0023 (landing page), 0024 (app screens). Reference pages: type & colour https://claude.ai/artifact/7rSzxW5Wq2FGyeXB1ZYW5b · tokens https://claude.ai/artifact/88o4gNB5VAr19g45dVr7vL · atoms https://claude.ai/artifact/MQ27jvFsTFAymw2m4wWWne · molecules https://claude.ai/artifact/XXtkEkC2j9rV85HyaSHJDE · logo canvas https://claude.ai/artifact/6CDbDc7iEf1dJ9915g4A5A · landing hero https://claude.ai/artifact/1NoWeSTfCmPube65ZuGFND · landing page https://claude.ai/artifact/UbEKNBkgq8ZgL1FASXuMsY · app screens https://claude.ai/artifact/PbSqEU9tYHQNB3vE1XDbVG. Brand files: `docs/brand/`.

## 1. Tokens

### Colour
Neutrals have a faint violet tint (hue 292). Surfaces are **flat**: one background, panels separated by borders only. Shadows are used only for floating layers (menus, popovers, toasts).

| Token | shadcn name(s) | Light | Dark |
|---|---|---|---|
| `bg` | `background`, `card`, `popover`, `input` fill | `oklch(0.997 0.002 292)` | `oklch(0.17 0.012 292)` |
| `fg` | `foreground` | `oklch(0.2 0.025 292)` | `oklch(0.965 0.006 292)` |
| `subtle` | `muted`, `secondary`, `accent` (hover surface) | `oklch(0.966 0.008 292)` | `oklch(0.215 0.016 292)` |
| `border` | `border`, `input` | `oklch(0.912 0.014 292)` | `oklch(0.29 0.02 292)` |
| `border-strong` | hover border (secondary button, input), checkbox | `oklch(0.84 0.02 292)` | `oklch(0.38 0.025 292)` |
| `muted` | `muted-foreground` | `oklch(0.53 0.03 292)` | `oklch(0.71 0.025 292)` |
| `primary` (brand accent) | `primary`, `ring` | `#6440D8` | `#B3A1FF` |
| `on-primary` | `primary-foreground` | `#FFFFFF` | `#100B1F` |
| `danger` | `destructive` | `oklch(0.52 0.19 25)` | `oklch(0.74 0.14 25)` |
| `warning` | `warning` (billing chips and notice only) | `oklch(0.53 0.12 65)` | `oklch(0.82 0.12 80)` |

- Note the naming clash: shadcn's `accent` is a hover surface, not our brand colour. The brand violet is always `primary`.
- Violet is only for primary buttons, links, caret, selection (22% mix), focus rings (25% mix halo) and active toolbar buttons (16% mix). Everything else is neutral.
- Contrast: primary 6.4:1 (light) / 8.4:1 (dark); muted text passes AA in both themes.

### Landing-only surface tokens (ADR 0021)
Used only on the marketing pages, never in the app.

| Token | Use | Light | Dark |
|---|---|---|---|
| `glass-fill` | glass surface fill | `oklch(0.997 0.002 292 / .55)` | `oklch(0.17 0.012 292 / .55)` |
| `glass-edge` | 1px inner edge | `oklch(0.2 0.025 292 / .09)` | `rgb(255 255 255 / .1)` |
| `glass-hi` | top highlight | `rgb(255 255 255 / .95)` | `rgb(255 255 255 / .2)` |
| `glass-lo` | bottom inner shade | `oklch(0.2 0.025 292 / .07)` | `rgb(0 0 0 / .35)` |
| `glass-shadow` | soft drop shadow | `oklch(0.2 0.025 292 / .16)` | `rgb(0 0 0 / .55)` |
| `glow` / `glow-2` | hero glow | `primary` at 13% / 9% | same mix |
| `key-face` / `key-side` / `key-legend` / `plate` | keyboard | `oklch(0.995 0.002 292)` / `oklch(0.86 0.016 292)` / `oklch(0.38 0.03 292)` / `oklch(0.94 0.01 292)` | `oklch(0.255 0.016 292)` / `oklch(0.12 0.01 292)` / `oklch(0.8 0.02 292)` / `oklch(0.205 0.014 292)` |

**Glass surface:** `glass-fill` + `backdrop-filter: blur(10px) saturate(1.6)` + inset highlight (`glass-hi` top, `glass-edge` ring, `glass-lo` bottom) + `glass-shadow`. In Chromium the backdrop also gets an SVG refraction filter (edges bend what's behind, slight colour split); Safari and Firefox get the frosted blur only. Exception to "flat surfaces", landing only.

**Hero glow:** two very soft radial gradients of `glow` / `glow-2` behind the hero (behind the keyboard on desktop, behind the toolbar on phone). The only gradient in the system.

### Typography
**Geist** everywhere (UI, headings, default writing font). Writing font is a per-user setting: Geist or IBM Plex Serif, nothing else (ADR 0010, 0031). Scale ratio **1.333 (Expressive)**, base 16px; `xs` and `sm` are fixed UI sizes.

| Token | px | Used for | Weight · tracking · line-height |
|---|---|---|---|
| `xs` | 12 | labels, meta, help text | 400 · 0 · 1.4 |
| `sm` | 14 | buttons, inputs, menus | 400–500 · 0 · 1.4 |
| `base` | 16 | body, list rows | 400 · 0 · 1.55 (editor 1.65) |
| `lg` | 21 | section heads, hero subline, doc H2 | 600 · -0.01em · 1.3 |
| `xl` | 28 | card titles | 600 · -0.02em · 1.2 |
| `2xl` | 38 | document H1 | 600 · -0.025em · 1.15 |
| `3xl` | 50 | page titles (marketing) | 600 · -0.03em · 1.1 |
| `display` | 84 | landing hero only | 600 · -0.035em · 1.02 |
| `logo-hero` | 112 | hero logotype only, `clamp(36px, 10cqi, 112px)` (ADR 0021) | logotype spec |

- Large steps are fluid on small screens: `display` = `clamp(44px, 12vw, 84px)`, `3xl` = `clamp(34px, 8vw, 50px)`. Phone sizes still to be checked in the screen templates.
- **OPEN:** whether the document H1 in the editor uses `2xl` (38) or `xl` (28). 38 may feel large while writing; decide on the editor template.
- Running text max ~68ch in the editor.

### Spacing (Comfortable)
| `s-1` | `s-2` | `s-3` | `s-4` | `s-5` | `s-6` | `s-7` |
|---|---|---|---|---|---|---|
| 4 | 8 | 12 | 16 | 24 | 32 | 48 px |

Tailwind's default 4px `--spacing` already produces these (`1, 2, 3, 4, 6, 8, 12`); components use only these seven steps. Layout gaps between page sections may go higher (64, 96) on marketing pages.

### Radius (Soft)
`r-sm` 5px (inputs, chips, toolbar buttons) · `r-md` 7px (buttons, menus, toasts) · `r-lg` 10px (cards, panels, editor frame) · `r-full` 999px (landing pill header and its items only, ADR 0021).

### Control heights
Every control that can sit in a row with others uses one of three shared heights, so buttons, inputs, toasts and toolbars always line up. One line of text only; controls never wrap or grow.

| Token | px | Used for |
|---|---|---|
| `h-sm` | 32 | compact rows, small actions, editor toolbar toggles |
| `h-md` | 36 | default: buttons, inputs, icon buttons, **all toasts** |
| `h-lg` | 44 | landing CTAs and sign-up input, editor toolbar container, touch targets |

In code (Tailwind): `h-control-sm` / `h-control-md` / `h-control-lg`. All tokens live in `src/app/globals.css`, pinned to this file by `src/app/tokens.test.ts`.

### Motion (Subtle)
`dur-1` 120ms (hover, menus, popovers) · `dur-2` 200ms (toasts, dialogs) · easing `cubic-bezier(0.2, 0, 0, 1)`. Under `prefers-reduced-motion` all durations are 0.

### Focus
2px outline in `primary`, 2px offset; inputs use a `primary` border plus a 3px halo at 25%.

### Layout rules (ADR 0013, rule 4 ADR 0015)
These apply to every atom, molecule, organism and screen.

0. **No new elements without approval.** Screens use only what is in this design system. A new element, a new variant, or an inline one-off style is never added directly: propose it to the user, and once confirmed, add it here (and on the design-system page) first, then use it.

1. **Never put elements of different heights next to each other.** Anything side by side in a row shares one height: a control height (`h-sm` 32 / `h-md` 36 / `h-lg` 44) for interactive items, or the same text line box for text. If two things can't share a height, they don't share a row: stack them, or make the smaller one the same height (e.g. a badge in a toolbar row becomes an `h-sm` chip, never a 22px pill beside a 36px button).
2. **Gaps inside a space are all equal.** Within one container, every gap between its children uses the same spacing step, horizontally and vertically. No mixed gaps between siblings.
3. **Padding at the edges is slightly larger than the gaps inside.** The inset from a container's edge to its content is **one step up** the spacing scale from that container's gap:

| Gap between children | Edge padding |
|---|---|
| 0 (touching, e.g. menu items) | `s-1` 4 |
| `s-1` 4 | `s-2` 8 |
| `s-2` 8 | `s-3` 12 |
| `s-3` 12 | `s-4` 16 |
| `s-4` 16 | `s-5` 24 |
| `s-5` 24 | `s-6` 32 |
| `s-6` 32 | `s-7` 48 |

Exception: controls with a fixed height (buttons, inputs, toasts, toolbars) centre their content vertically, so only their horizontal padding follows rule 3.

4. **Text always fits its box, and left and right padding are equal.** Text never runs past a container's padding or gets cut off mid-letter. Where a row is too narrow, shorten the copy or stack the parts; a single-line title may end in “…” only where truncation is the designed behaviour (document titles). Left and right edge padding are always the same step (user, 2026-10-19).

5. **Spacing is measured on the ink** (ADR 0021). Text blocks are trimmed to cap height and baseline (`text-box: trim-both cap alphabetic`) wherever gaps between text and other elements must look equal, so a gap is the distance you see, not the invisible line box. Icons next to trimmed text must not make the row taller (negative block margin). Chrome and Safari support it; Firefox falls back to normal line boxes (accepted).

## 1b. Logo and loaders (ADR 0012)
**Logotype:** "Richer" Geist 700 + "Text" Geist 400, no space, stretch 1.08×, tracking −0.045em, **italic (10° slant)**, colour `fg`. Static, no animation. Assets: `docs/brand/` (outlined SVG, PNG, favicon.ico).

**Icon** (app icon, favicon): "RT": R Geist 700 + T Geist 400, slant 10°, stretch 1.08×, tracking −0.05em, `#F3F3F7` on the dark tile `#0F0F14` (radius 40/180). Shifted **0.04em left** for optical centring (the slant makes true centre look right-heavy). Sizes 180 / 64 / 32 / 16.

**Loaders**
| Where | Loader | Spec |
|---|---|---|
| App loading (first load, page changes) | "Aa" morphing + three dots | Aa 64px, light → bold → italic, 2.4s alternate; dots 8px, pulse in turn 1.2s, 0.15s stagger |
| Small spaces (panels, lists, account) | same | Aa 28px, dots 4px |
| Opening a document | writing lines | three neutral lines (100 / 78 / 52%) drawn in turn with a violet caret, fade out, reset while invisible, fade in; 2.6s seamless loop |
| Buttons | ring spinner | overlays the hidden label, width never changes |

Reduced motion: static "Aa", gently fading dots, static lines. Canvas: https://claude.ai/artifact/6CDbDc7iEf1dJ9915g4A5A.

## 2. Atoms
**Final** (2026-10-19, ADR 0013): https://claude.ai/artifact/MQ27jvFsTFAymw2m4wWWne (includes logotype, icon and loaders). Review defaults accepted: secondary buttons outlined with a 1px pressed nudge; toolbar "on" state in violet tint; links in documents match app links; labels always above fields, never placeholder-as-label; badges keep the status dot; Lucide icons at stroke 1.75; toasts `h-md`, editor toolbar `h-lg` with `h-sm` toggles. Still **OPEN:** document title 38px vs 28px (decide on the editor template).

**Rule: components never change size when their state changes.** Hover, focus, pressed, disabled and loading must not move layout. A loading button keeps its label in place (hidden with `visibility: hidden`, still taking space) and shows the spinner centred on top; no label swaps such as "Save" → "Saving…". Same for toggles, badges and inputs (focus uses outline/box-shadow, never a thicker border).

Atoms: text styles, button (primary, secondary, ghost, danger; sm/md/lg; all states incl. loading), icon button, toolbar toggle, link (inline, nav), input (sm/md/lg) with label, help and error, checkbox, badge, shortcut key, tooltip, toast, spinner, divider, Lucide icons, logotype, icon, loaders.

**Changes after approval:** toast padding equal on both sides (published to the atoms page v5); input with an icon inside (leading search icon; trailing show/hide button, a ghost `h-sm` icon button inset 2px) added in ADR 0015; toast padding is `s-4` on both sides, the action is a text button with no own padding (rule 4).

## 3. Molecules
**Final** (2026-10-19, ADR 0015): https://claude.ai/artifact/XXtkEkC2j9rV85HyaSHJDE. Built only from atoms; every one checked against the layout rules.

| Molecule | Built from | Spec |
|---|---|---|
| Form field | label, input, help/error, link, icon button | gap `s-2` 8 between all parts; label above; error replaces help in place; optional link on the label line (e.g. "Forgot password?"); password has a show/hide button inside |
| Filter field | input sm with leading search icon | for the document list header |
| Action group | buttons | one size per group, gap `s-3`, at most one primary; forms/dialogs: main action on the right; landing: main action first; wraps on phone |
| Nav group | nav links, button | every item in an `h-md` box, gap `s-5`; current page full strength |
| List row (base) | — | `h-lg` 44 row, every child in an `h-sm` 32 box, gap `s-3`, edges `s-4`; rows split by 1px borders inside an `r-lg` bordered list |
| Document row | icon, title, meta, icon button sm | title sm 500, one line, "…"; meta "Edited 2 min ago" sm muted, tabular (drops "Edited" under 420px); whole row opens the doc; menu button on hover/focus, always on touch; rename in place (title → input sm, same height; Enter saves, Esc cancels); states: hover, focus, renaming, menu open |
| Settings row | key, value, button sm | key sm muted in a fixed column; value one line with "…"; status badge as an `h-sm` chip; under 440px the key moves onto its own line (gap `s-3`, edges `s-4`); the button is optional, a row can show a value only (user, 2026-10-21) |
| Menu | menu items, divider, label | items `h-sm`, sm, icon + label (+ shortcut), gap 0, edge `s-1`; inside an item gap `s-2`, edge `s-3`; Delete is the only danger item; theme as checked items (System / Light / Dark); border + shadow; arrows / Enter / Esc |
| Editor toolbar groups | toolbar toggles, dividers, tooltips | undo redo · H1 H2 H3 · B I U S · bullets, numbers, quote · link; bar `h-lg`, toggles `h-sm`; headings exclusive; on phone scrolls sideways, never wraps |
| Link editor | input sm with link icon, button sm, icon button sm | opens under the selection (link button / ⌘K); all items `h-sm`, gap `s-2`, edges `s-3`; floating layer, max 380 (phone: screen width less 16px each side). Placeholder "Paste or type a link"; Apply (primary sm); Remove link (ghost icon, unlink) only when editing a link. Enter applies, Esc closes. Bad address: input invalid state only (red border; the hint is for screen readers), nothing changes size. Built 2026-10-21 (ADR 0030) |
| Saved indicator | icon, spinner, text, link | **Quiet (user, 2026-10-21):** floats in the editor's bottom-right corner, `s-5` from the edges (phone `s-4`), right-aligned, no box; xs text, 14px icons; Saved at 50% opacity, Saving and Saved on device at 70%, Not saved · Retry never faded. `h-sm`; states Saved / Saving / Saved on device / Not saved · Retry, stacked in one box so the width never changes; muted, danger for errors; polite live region, announces errors and Saved on device. **Saved on device** (user, 2026-10-21, ADR 0029): Lucide `CloudOff` + "Saved on device", muted, no tooltip; shown while edits wait offline in the device cache, back to Saved once the server confirms |
| Price line + feature item | text styles, icon | amount 3xl 600 + period sm muted on one baseline; feature = check icon + sm text, gap `s-2`; list gap `s-2` |
| Notice | icon, text, button sm | one `h-lg` line when ≥ 560px, else stacks (text, then button); padding `s-4` both sides; neutral (subtle) or warning tint (billing only); text wraps, never cut; the button is optional (payment-due notice has none: the row below has Update card) |
| Empty state | text styles, button | text group (lg title + sm muted line, gap `s-1`) and action; gap `s-4`, edges `s-5`; no illustration |

## 4. Organisms
**Final** (2026-10-20, ADR 0016): https://claude.ai/artifact/RaFk4SGCtxNByEdQCWdcT7. Built only from atoms and molecules.

New tokens: `h-bar` 64 (every page bar) · `scrim` (behind dialogs: `oklch(0.2 0.025 292 / .4)` light, `rgb(0 0 0 / .6)` dark).

| Organism | Built from | Spec |
|---|---|---|
| Pill header (landing) | icon tile, nav links, button sm, icon button | ADR 0021. Floating, centred, `glass`, `r-full`, `h-lg` 44; every item `h-sm` 32 (icon in a 32px **circle**, not the rounded square, user 2026-10-20; links, Subscribe sm, menu button), gap `s-1`, sides `s-2`; `s-5` above. Phone: icon tile + Subscribe + menu button |
| Site header | logotype, nav group, button, menu | `h-bar`, border below, sticky; sides `s-6`, gap `s-5`; phone: logotype + small Start writing + menu button (Pricing, Sign in), sides `s-4`, gap `s-3` |
| Hero (landing) | logotype, typed line, text styles, action group lg, feature items, hero toolbar, keyboard | **Final, variant C** (ADR 0021, https://claude.ai/artifact/1NoWeSTfCmPube65ZuGFND). One centred column, one gap between every element: logo (`logo-hero`, static) · typed headline (xl 28, phone lg 21, one line, violet caret) · subhead (base muted, max 52ch) · Subscribe + Start free (lg) · price note (xs muted) · three benefits · hero toolbar · keyboard. Gap `s-6` 32, edges `s-7` 48, keyboard flush with the bottom; phone gap `s-4` 16, edges `s-5` 24, no keyboard, toolbar moves under the logo. Typed line: rests on the headline, then select-all + delete and types the next line (with ⌘B/⌘I/⌘U shown on the keyboard and toolbar); visitor typing takes over and joins the queue (last 3), erased the same way. Glow behind. Reduced motion: headline static, no key animation |
| Hero toolbar | toolbar toggles, dividers | editor toolbar groups shortened to H1 H2 · B I U S · link, `glass`; a glass lens slides to the last pressed button; clickable for B I U |
| Keyboard | — | CSS keycaps, Mac layout, 15.7 units wide, max 720, tilted back 24° (`perspective(1400px)` inside the keyboard's own transform, for Safari); keys press (down 0.07u) for demo and visitor keys; `return` in `primary`; hidden on phone; `aria-hidden` |
| Pricing block | price line, feature items, action group, badge chip | section heading 3xl + lg muted, gap `s-6` to the cards; three cards Free · Yearly · Monthly (ADR 0020, 0023), same parts in the same order (name row `h-sm`, price, features, action, note), equal height, gap `s-5`; Yearly with a "Save" chip and the only primary button; card gap `s-5`, edges `s-6` (phone `s-4` / `s-5`); stack when narrow |
| Site footer | nav group | `h-bar`, border above; © left, Terms / Privacy / Refunds right; phone stacks, gap `s-3`, edges `s-4` |
| Auth forms | form field, checkbox, link, action group | sign up, sign in, reset password; card max 400, gap `s-5`, edges `s-6` (phone `s-4` / `s-5`); fields gap `s-4`; footer: way out left (text in an `h-md` box), main button right, button on top when narrow; no verify-email step (ADR 0017) |
| Document list | app bar, filter field, document row, empty state, loader, dialog, toast | page max 760, gap `s-5`, edges `s-6` (phone `s-4` / `s-5`); title · filter + New · rows; loading box holds four rows; delete asks in a dialog, then a toast |
| Dialog | text styles, action group | scrim; card max 400, border, `r-lg`, gap `s-5`, edges `s-6` (phone `s-4` / `s-5`); heading lg + one muted line; Cancel (secondary) then main action (danger for delete) on the right; Esc closes, focus starts on Cancel |
| Editor | toolbar groups, saved indicator, link editor | one `h-bar` bar (back, toolbar, account; Read-only chip before account when read-only), items `h-lg`; phone: header row then the toolbar on its own line; Saved floats bottom-right (2026-10-21); column 68ch, 16px, line height 1.65, blocks `s-4` apart; title its own field, xl 28, "Untitled" by default; H1 28 · H2 21 · H3 16/600; caret and selection violet |
| Account | settings row, notice, nav group | Profile · Writing · Subscription, each lg heading + rows, gap `s-3`; Manage opens the Stripe Customer Portal; failed payment shows a warning notice on top; account deletion OPEN |
| Toast placement | toast | bottom centre, one at a time, 5s |

## 5. Templates
Done (desktop + phone, light + dark): landing, auth, document list, editor, pricing (landing section reused in the app), account, back from Checkout, not found.

**Landing: final** (2026-10-20, ADR 0023, https://claude.ai/artifact/UbEKNBkgq8ZgL1FASXuMsY). Order: sticky pill header · hero C · Features · Reviews · Pricing · FAQ · closing call to action · footer (minimal).

| Element | Spec |
|---|---|
| Landing section | centred head: title 3xl + lg muted line, gap 24 (phone 16, line base); head to content 32 (phone 24); sides 48 (phone 24); 96 between sections (phone 64); content max 1080 |
| Feature card | demo stage 196px, `subtle`, `r-md`, keycap readout top-right (shortcut being pressed); then title lg + sm muted line (gap 4); card gap 16, edges 24, `r-lg` border; bento grid 3 columns with wide cards spanning 2, gap 24; 2 across ≤ 900, 1 across ≤ 560 (gap 16); demos run only while on screen, finished state under reduced motion |
| Feature demos | formatting (meeting notes → H1, bold, list, quote with ⌘⌥1 / ⌘B / ⌘⇧8 / ⌘⇧B), link (select, ⌘K, type address, ↵), autosave (Saving → Saved), paste (source app → RicherText → destination app, logos rotate: Docs, Word, Gmail, Outlook; the stage is its own container: tiles shrink to 44px under 340px and drop their names under 240px, the "kept" line wraps), export (RT doc → PDF, DOCX, RTF, MD, HTML, TXT; under 280px only the six files show), fonts × themes (Geist / Plex Serif, light / dark mini page) |
| Review card | top row `h-sm`: five stars (Google yellow) + Google "G"; quote base; byline: 36px round portrait + name sm 500 / role xs muted (two 18px lines = 36); gap 16, edges 24; 3 across, 1 across ≤ 900 (max 520) |
| FAQ list | `<details>` rows in an `r-lg` bordered list split by 1px lines; question base 500, min `h-lg`, padding 12/16, plus icon turns 45° to ×; answer sm muted, max 64ch; list max 720 |
| Closing call to action | section head + Subscribe / Start free (lg) + price note, gap 16 |
| Pricing (three cards) | Free · Yearly (Save chip, only primary button) · Monthly; equal height, same parts in the same order; 1 column ≤ 900 (max 420), same order |
| Colour exception | third-party logos (Google Docs, Word, Gmail, Outlook, Google "G") keep their colours; stars Google yellow; file-type labels PDF red, DOCX blue, HTML orange, others neutral. Landing only; official brand assets in the real page |
| Keyboard tilt | `perspective(1400px) rotateX(24deg)` on the keyboard itself (Safari ignored the parent's `perspective`) |

Reviews and portraits are placeholders until launch (CONTEXT §6).

**App screens: final** (2026-10-20, ADR 0024, https://claude.ai/artifact/PbSqEU9tYHQNB3vE1XDbVG). Built only from the organisms; new elements approved by the user.

| Screen / element | Spec |
|---|---|
| Auth page | logotype bar (`h-bar`, logo links home) · auth card centred in the space left · site footer; card edges `s-7` (phone `s-5` / `s-4`). Sign up line names the next step (Checkout for the chosen plan, or the documents page on Free) |
| Password rule | sign up help reads "At least 8 characters." and the error "Use at least 8 characters." (ADR 0026; the template showed 10) |
| Reset link sent | same card: heading "Reset link sent" + one line (doesn't reveal whether the account exists) + Back to sign in. Forgot-password only; no verification (ADR 0017) |
| Account menu | from the user icon button; menu label (email) · Documents · Account · divider · label Theme · System / Light / Dark (checked items) · divider · Sign out; drops `s-1` under the bar, right-aligned. The only navigation on phone |
| Document menu | `h-lg` ghost menu button between Saved and the account button (phone header row: back · saved · menu · account); label "Export as" · PDF, Word (.docx), Rich Text (.rtf), Markdown, HTML, Plain text (download icon) · divider · Delete document (danger, asks first). Export: toast "Preparing PDF…" → download → toast "PDF downloaded". Built 2026-10-21 with the Export items disabled until export exists (user); with Saved now floating, the bar reads … · Read-only chip · menu · account (phone: back · menu · account). After Delete the list shows the toast "Document deleted" |
| Disabled menu item | `disabled`, 45% opacity, no hover, not focusable; on Free every export item shows a lock and the label reads "Export · paid plans" |
| Upgrade dialog | **Not used** (user, 2026-10-21, ADR 0028): New document on Free with one document goes straight to `/plans`. Kept here in case it comes back: dialog organism with a primary action: heading + one line · Not now (secondary) · See plans (primary) |
| Read-only state | chip (`bd-neutral`, lock + "Read-only", `h-sm`) in the row before the menu (meta drops, title muted, under 420px lock only) and in the editor bar before the account button; toolbar disabled; neutral notice with Resubscribe above the title (68ch column, `s-6` below, phone `s-5`) and on the list (between the filter row and the rows; built 2026-10-21). Text selectable, no caret |
| Empty document | title placeholder "Untitled", body "Start writing…", `muted`, gone on the first keystroke; caret in the body |
| New account | documents page with the empty state ("No documents yet" · New document) |
| Back from Checkout | logotype bar, centred: mark box 120px (Aa loader 64px) + text group (lg title, sm muted line), gap `s-5`. Waiting: "Activating your plan" / "Waiting for Stripe to confirm…". Success: loader fades + scales to .7 (`dur-2`), check circle (72px, `primary` 14% fill, `primary` tick, stroke 3) scales in with a slight overshoot (400ms) and the tick draws; text crossfades to "You're on Yearly" / "Taking you to your documents…"; both states stacked so nothing moves; 1.6s later fades to Documents. After 20s: "Still waiting on Stripe" / "Your plan switches on by itself as soon as Stripe confirms." + Go to documents (secondary); the button's space is kept from the start so nothing moves. Reduced motion: states swap · built at `/welcome` (ADR 0027) |
| Pricing (in app) | the landing pricing section exactly (§5 landing); Free card's button "Current plan", disabled, for Free users. Reached from See plans, Upgrade, Resubscribe · built at `/plans` (ADR 0027) |
| Account | subscription row states: Free (neutral chip, Upgrade) · Active (Manage) · Ends on date (warning chip, Resubscribe) · Payment due (Update card + warning notice). Built at `/account` (ADR 0027): Profile (Email, no Change yet) + Subscription; Writing (writing font, built 2026-10-21, ADR 0031) between Profile and Subscription. Change email / password: dialog with the fields, Cancel · Save. Writing font: menu with the fonts as checked items |
| Not found | the empty state alone on an app page: "This page isn't here" · "It may have been deleted, or the link is wrong." · Back to documents |
