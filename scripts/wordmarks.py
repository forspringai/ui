# The wordmarks as outlines (hub D-101): every product's name in Archivo Condensed 900, shaped with
# HarfBuzz (kerning included) and drawn as one SVG path in font units, so logo.svg renders without
# the font. Writes brand/wordmarks.json, which scripts/build.ts reads; run it only when a name or the
# font changes, and commit the JSON:
#
#   uv run --with fonttools --with brotli --with uharfbuzz scripts/wordmarks.py
#
# Python because fontTools and HarfBuzz are the tools that instance a variable font correctly; the
# build itself stays Node and needs neither.

import io
import json
from pathlib import Path

import uharfbuzz as hb
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
NAMES = ["Forspring", "Spring", "SiteSpring", "DataSpring", "AppSpring", "PulseSpring"]
WEIGHT = 900
# The bar's letter-spacing, -0.01em (components.css .brand .word), between letters only.
TRACKING = -0.01

ttf = io.BytesIO()
font = TTFont(ROOT / "fonts" / "archivo-condensed.woff2")
font.flavor = None
font.save(ttf)
upem = font["head"].unitsPerEm
cap = font["OS/2"].sCapHeight

face = hb.Face(ttf.getvalue())
hbfont = hb.Font(face)
hbfont.set_variations({"wght": WEIGHT})


class Pen:
    """Collects one glyph's outline as SVG path commands, y flipped so the baseline is y = 0."""

    def __init__(self, dx: float):
        self.dx = dx
        self.out: list[str] = []

    def p(self, x: float, y: float) -> str:
        # + 0.0 turns -0.0 into 0.
        return f"{round(x + self.dx, 1) + 0.0:g} {round(-y, 1) + 0.0:g}"

    def move_to(self, x, y, _=None):
        self.out.append("M" + self.p(x, y))

    def line_to(self, x, y, _=None):
        self.out.append("L" + self.p(x, y))

    def quadratic_to(self, x1, y1, x, y, _=None):
        self.out.append("Q" + self.p(x1, y1) + " " + self.p(x, y))

    def cubic_to(self, x1, y1, x2, y2, x, y, _=None):
        self.out.append("C" + self.p(x1, y1) + " " + self.p(x2, y2) + " " + self.p(x, y))

    def close_path(self, _=None):
        self.out.append("Z")


funcs = hb.DrawFuncs()
funcs.set_move_to_func(lambda x, y, pen: pen.move_to(x, y))
funcs.set_line_to_func(lambda x, y, pen: pen.line_to(x, y))
funcs.set_quadratic_to_func(lambda x1, y1, x, y, pen: pen.quadratic_to(x1, y1, x, y))
funcs.set_cubic_to_func(lambda x1, y1, x2, y2, x, y, pen: pen.cubic_to(x1, y1, x2, y2, x, y))
funcs.set_close_path_func(lambda pen: pen.close_path())

out = {"font": "Archivo Condensed", "weight": WEIGHT, "unitsPerEm": upem, "capHeight": cap, "tracking": TRACKING, "names": {}}
for name in NAMES:
    buf = hb.Buffer()
    buf.add_str(name)
    buf.guess_segment_properties()
    hb.shape(hbfont, buf, {"kern": True, "liga": True})
    x = 0.0
    d: list[str] = []
    count = len(buf.glyph_infos)
    for i, (info, pos) in enumerate(zip(buf.glyph_infos, buf.glyph_positions)):
        pen = Pen(x + pos.x_offset)
        hbfont.draw_glyph(info.codepoint, funcs, pen)
        d.extend(pen.out)
        x += pos.x_advance + (TRACKING * upem if i < count - 1 else 0)
    out["names"][name] = {"d": "".join(d), "width": round(x, 1)}

(ROOT / "brand" / "wordmarks.json").write_text(json.dumps(out, indent=2) + "\n")
print("brand/wordmarks.json:", ", ".join(NAMES))
