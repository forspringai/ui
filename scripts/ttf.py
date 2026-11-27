# TTF copies of the share image's faces (D-71), for renderers that read TrueType but not WOFF2, such as
# resvg (fontdb), which SiteSpring's build uses to turn shareImage() into PNG. Archivo Condensed is a
# variable font: it is instanced at 800, the weight shareImage() sets and measures, so a renderer that
# ignores the wght axis still draws 800. Space Mono is already static. Run it when a font changes and
# commit the files:
#
#   uv run --with fonttools --with brotli scripts/ttf.py

from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "fonts"

condensed = TTFont(FONTS / "archivo-condensed.woff2")
static = instancer.instantiateVariableFont(condensed, {"wght": 800})
static.flavor = None
static["OS/2"].usWeightClass = 800
# One family, "Archivo Condensed", at ExtraBold (800), so a renderer matching family and weight finds it,
# as the CSS asks for font-family "Archivo Condensed" at 800.
names = static["name"]
for (nid, text) in [(1, "Archivo Condensed ExtraBold"), (2, "Regular"), (4, "Archivo Condensed ExtraBold"), (6, "ArchivoCondensed-ExtraBold"), (16, "Archivo Condensed"), (17, "ExtraBold")]:
    names.removeNames(nameID=nid)
    names.setName(text, nid, 3, 1, 0x409)
    names.setName(text, nid, 1, 0, 0)
for nid in [25]:
    names.removeNames(nameID=nid)
static.save(FONTS / "archivo-condensed-800.ttf")

mono = TTFont(FONTS / "space-mono.woff2")
mono.flavor = None
mono.save(FONTS / "space-mono.ttf")

for f in ["archivo-condensed-800.ttf", "space-mono.ttf"]:
    t = TTFont(FONTS / f)
    print(f, "fvar" in t, t["OS/2"].usWeightClass, t["name"].getDebugName(16) or t["name"].getDebugName(1), t["name"].getDebugName(17) or t["name"].getDebugName(2), (FONTS / f).stat().st_size)
