"""Export the RicherText logotype and icon as outlined SVG (ADR 0012).

Usage: python export_brand.py <Geist[wght].ttf> <out_dir>
Mirrors the CSS used on the design canvas: Geist variable font, per-word weight,
letter-spacing, then transform "translateX skewX(-10deg) scaleX(1.08)" around the box centre.
"""
import math
import sys
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.basePen import BasePen
from fontTools.pens.recordingPen import RecordingPen

FONT_PATH, OUT = sys.argv[1], Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)

blob = hb.Blob.from_file_path(FONT_PATH)
face = hb.Face(blob)
UPEM = face.upem


def oklch_to_hex(L, C, h):
    a, b = C * math.cos(math.radians(h)), C * math.sin(math.radians(h))
    l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s_ = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    rgb = (
        4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
        -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
        -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_,
    )
    def enc(c):
        c = min(max(c, 0.0), 1.0)
        c = 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055
        return round(c * 255)
    return "#" + "".join(f"{enc(c):02X}" for c in rgb)


INK_LIGHT = oklch_to_hex(0.2, 0.025, 292)    # fg, light theme
INK_DARK = oklch_to_hex(0.965, 0.006, 292)   # fg, dark theme
TILE = oklch_to_hex(0.17, 0.012, 292)        # dark tile ("black")


def runs_outline(runs, size, tracking):
    """Shape each (text, weight) run, return (list of glyph point-commands in CSS px, box width, ascent, descent)."""
    s = size / UPEM
    x = 0.0
    glyphs = []
    for text, weight in runs:
        font = hb.Font(face)
        font.set_variations({"wght": weight})
        buf = hb.Buffer()
        buf.add_str(text)
        buf.guess_segment_properties()
        hb.shape(font, buf, {"kern": True, "liga": False})
        for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
            rec = RecordingPen()
            font.draw_glyph_with_pen(info.codepoint, rec)
            glyphs.append((x + pos.x_offset * s, rec, s))
            x += pos.x_advance * s + tracking * size
    ext = hb.Font(face).get_font_extents("ltr")
    return glyphs, x, ext.ascender * s, -ext.descender * s


class Collect(BasePen):
    def __init__(self, fn):
        super().__init__(None)
        self.fn, self.d = fn, []
    def _p(self, pt):
        x, y = self.fn(pt)
        return f"{x:.2f} {y:.2f}"
    def _moveTo(self, pt): self.d.append("M" + self._p(pt))
    def _lineTo(self, pt): self.d.append("L" + self._p(pt))
    def _curveToOne(self, a, b, c): self.d.append("C" + " ".join(self._p(p) for p in (a, b, c)))
    def _qCurveToOne(self, a, b): self.d.append("Q" + " ".join(self._p(p) for p in (a, b)))
    def _closePath(self): self.d.append("Z")


def build(runs, size, tracking, stretch=1.08, slant=10, shift_em=0.0):
    """Return (svg path d, ink bbox) in CSS px with the box centre at (0, 0)."""
    glyphs, width, asc, desc = runs_outline(runs, size, tracking)
    box_h = size                      # line-height: 1
    baseline = (box_h - (asc + desc)) / 2 + asc
    cx, cy = width / 2, box_h / 2
    t = math.tan(math.radians(slant))
    pts = []

    def fn_for(gx, s):
        def fn(p):
            X = gx + p[0] * s
            Y = baseline - p[1] * s
            dx, dy = X - cx, Y - cy
            nx = stretch * dx - t * dy + shift_em * size
            pts.append((nx, dy))
            return nx, dy
        return fn

    d = []
    for gx, rec, s in glyphs:
        pen = Collect(fn_for(gx, s))
        rec.replay(pen)
        d.extend(pen.d)
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return " ".join(d), (min(xs), min(ys), max(xs), max(ys))


def write(name, svg):
    (OUT / name).write_text(svg)
    print("wrote", OUT / name)


# Logotype: cropped to ink with a small margin.
d, (x0, y0, x1, y1) = build([("Richer", 700), ("Text", 400)], 100, -0.045)
pad = 4
vb = f"{x0 - pad:.2f} {y0 - pad:.2f} {x1 - x0 + 2 * pad:.2f} {y1 - y0 + 2 * pad:.2f}"
for suffix, fill in (("", "currentColor"), ("-on-light", INK_LIGHT), ("-on-dark", INK_DARK)):
    write(f"richertext-logotype{suffix}.svg",
          f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="RicherText">'
          f'<path fill="{fill}" d="{d}"/></svg>\n')

# Icon: RT on a dark rounded tile, glyphs 104/180 of the tile, optically shifted 0.04em left.
T = 180
d, _ = build([("R", 700), ("T", 400)], 104, -0.05, shift_em=-0.04)
icon = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-T/2} {-T/2} {T} {T}" role="img" aria-label="RicherText">'
        f'<rect x="{-T/2}" y="{-T/2}" width="{T}" height="{T}" rx="40" fill="{TILE}"/>'
        f'<path fill="{INK_DARK}" d="{d}"/></svg>\n')
write("richertext-icon.svg", icon)
print("colours", INK_LIGHT, INK_DARK, TILE)
