# Brand assets

Outlined from Geist (SIL Open Font License), so they render the same everywhere without the font. Decision: ADR 0012; specs: `docs/DESIGN.md` §1b.

| File | Use |
|---|---|
| `richertext-logotype.svg` | Logotype, `fill="currentColor"`: inline in the app so it follows light/dark |
| `richertext-logotype-on-light.svg` / `-on-dark.svg` | Fixed-colour logotype (`#161421` / `#F3F3F7`) for places without CSS (email, docs) |
| `richertext-icon.svg` | Icon: "RT" on the dark tile (`#0F0F14`), optically centred; also `favicon.svg` |
| `favicon.ico` | 16, 32, 48 px |
| `icon-32.png`, `icon-192.png`, `icon-512.png` | Web app manifest / PWA sizes |
| `apple-touch-icon.png` | 180 px |

These move into the Next.js app (`public/` and `app/icon.*`) when it is scaffolded (Phase 1).

## Regenerate
`export_brand.py` reproduces the SVGs from the Geist variable font, using the exact canvas values (weights, tracking, 1.08× stretch, 10° slant, 0.04em optical shift on the icon). Needs `fonttools` and `uharfbuzz`:

```
python export_brand.py "Geist[wght].ttf" docs/brand
for n in 16 32 48 180 192 512; do rsvg-convert -w $n -h $n richertext-icon.svg -o icon-$n.png; done
magick icon-16.png icon-32.png icon-48.png favicon.ico
```
