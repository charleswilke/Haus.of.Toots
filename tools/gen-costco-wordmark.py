# /// script
# requires-python = ">=3.11"
# dependencies = ["fonttools>=4.60", "skia-pathops>=0.9"]
# ///
"""Regenerate the fixed Costco lettering: uv run tools/gen-costco-wordmark.py.

Uses the local macOS Arial Black as a starting point. Only the six outlined
letters are exported; no font is shipped. Stroke expansion is baked into the
contours, keeping the small counters and heavy strokes consistent on phones.
"""
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from pathlib import Path
import pathops
font = TTFont('/System/Library/Fonts/Supplemental/Arial Black.ttf')
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
pen = SVGPathPen(glyphs, ntos=lambda n: format(n, '.2f').rstrip('0').rstrip('.') if n else '0')
x = 0
for i, ch in enumerate('COSTCO'):
    name = cmap[ord(ch)]
    size = 1.10 if i == 0 else 1
    # A broader silhouette, a restrained forward lean and close spacing.
    glyphs[name].draw(TransformPen(pen, (size * 1.06, 0, size * .23, -size, x, 0)))
    x += glyphs[name].width * size * 1.06 - 65
from fontTools.svgLib.path import parse_path
original = pathops.Path()
parse_path(pen.getCommands(), original.getPen())
expanded = pathops.Path(original)
expanded.stroke(80, pathops.LineCap.ROUND_CAP, pathops.LineJoin.ROUND_JOIN, 4)
expanded.convertConicsToQuads(.1)
outline = pathops.op(original, expanded, pathops.PathOp.UNION)
pen = SVGPathPen(None, ntos=lambda n: f'{n:.2f}'.rstrip('0').rstrip('.') if n else '0')
outline.draw(pen)
path = pen.getCommands()
bounds = BoundsPen(None)
outline.draw(bounds)
x0,y0,x1,y1 = bounds.bounds
pad = 25
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0-pad:.2f} {y0-pad:.2f} {x1-x0+2*pad:.2f} {y1-y0+2*pad:.2f}" fill="#ce2a2d">
  <title>Costco</title>
  <!-- Custom outlined wordmark: broad italic lettering and an oversized first C.
       Geometry is fixed so no installed font or synthesized weight is needed. -->
  <path id="lettering" d="{path}"/>
</svg>
'''
destination = Path(__file__).resolve().parents[1] / 'images/costco-wordmark.svg'
destination.write_text(svg)
print(f'Wrote {destination.name} ({len(svg)} bytes)')
