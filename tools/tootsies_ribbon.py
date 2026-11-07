"""Add the dimensional tattoo ribbon to the outlined matchbook wordmark.

The ribbon is hand-built SVG: no fonts, bitmaps, or rendering dependencies.
Run `python3 tools/tootsies_ribbon.py` to update the existing full/small assets.
The tracing generator also calls add_ribbon so regeneration retains the artwork.
"""

from pathlib import Path
import math
import xml.etree.ElementTree as ET


NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", NS)

# Bounds of the approved, outlined subtitle paths, in their original path order.
# Keep the actual letter contours; only move/tilt them to follow the ribbon.
LETTER_BOUNDS = [
    (770.738, 614.698, 83.637, 136.483),
    (837.978, 614.901, 96.170, 133.529),
    (639.801, 616.572, 85.210, 130.723),
    (935.016, 616.178, 81.959, 134.302),
    (550.167, 618.975, 84.764, 127.525),
    (483.067, 621.458, 70.106, 126.082),
    (1023.622, 622.852, 61.780, 127.280),
    (404.995, 624.890, 73.365, 125.504),
    (319.002, 627.834, 95.823, 128.255),
    (1083.684, 628.288, 83.947, 125.727),
    (236.666, 631.459, 105.357, 131.652),
    (1169.611, 631.852, 92.123, 130.831),
]

RIBBON = '''<svg xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ribbon-ivory" x1="0" y1="0" x2="0" y2="1">
      <stop stop-color="#fff4dd"/>
      <stop offset="1" stop-color="#fae9c9"/>
    </linearGradient>
    <clipPath id="tootsies-name-ink"><use href="#tootsies-lettering"/></clipPath>
  </defs>
  <g id="tattoo-parlor-ribbon" transform="translate(0 -8)" stroke="#59134f" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">
    <!-- The return folds lead outward to tails level with the ribbon face. -->
    <g id="ribbon-left-tail">
      <path d="M389 863C397 875 378 879 359 870C265 835 177 825 86 858L116 788L83 708C155 748 205 738 267 758C326 780 367 827 389 863Z" fill="#fae9c9"/>
      <path d="M287 847C306 825 327 806 349 794C365 814 381 838 389 863C362 854 340 858 317 863C303 863 293 858 287 847Z" fill="#f0e4c8"/>
    </g>
    <use href="#ribbon-left-tail" transform="translate(1500 0) scale(-1 1)"/>
    <!-- Rounded front ends roll underneath into the exposed return folds. -->
    <path id="ribbon-face" d="M235 686C500 552 1000 552 1265 686C1292 705 1293 737 1270 776C1254 805 1234 830 1213 847C966 730 534 730 287 847C266 830 246 805 230 776C207 737 208 705 235 686Z" fill="url(#ribbon-ivory)"/>
  </g>
</svg>'''


def add_ribbon(svg: str) -> str:
    root = ET.fromstring(svg)
    subtitle = root.find(f"{{{NS}}}g[@id='tattoo-parlor-lettering']")
    letters = list(subtitle.iter(f"{{{NS}}}path")) if subtitle is not None else []
    if len(letters) != len(LETTER_BOUNDS):
        raise ValueError("Expected the approved twelve-path matchbook subtitle")

    # Rebuild only our ribbon layers so later art passes are repeatable and keep
    # all original outlined lettering, paint accents, and ink flecks intact.
    for layer in list(root):
        if layer.get("id") in {"tattoo-parlor-ribbon", "tootsies-cream-outline"} or (
            layer.tag == f"{{{NS}}}defs"
            and layer.find(".//*[@id='ribbon-ivory']") is not None
        ):
            root.remove(layer)
    for child in list(subtitle):
        subtitle.remove(child)
    subtitle.extend(letters)

    root.set("viewBox", "52 102 1414 795")
    root.set("width", "1414")
    root.set("height", "795")
    root.find(f"{{{NS}}}desc").text = (
        "Expressive plum Tootsie’s lettering with a coral offset, above Tattoo "
        "Parlor on an arched cream ribbon with rounded ends, light return folds, "
        "and outward tails level with the ribbon face, outlined in plum. "
        "All artwork is outlined vector paths."
    )
    artwork = ET.fromstring(RIBBON)
    root.insert(2, artwork.find(f"{{{NS}}}defs"))
    root.insert(3, artwork.find(f"{{{NS}}}g"))

    # Keep the name's cream outline intrinsic to the standalone SVG artwork.
    outline = ET.Element(f"{{{NS}}}g", {
        "id": "tootsies-cream-outline", "fill": "none", "stroke": "#fff6e4",
        "stroke-width": "18", "stroke-linejoin": "round", "aria-hidden": "true",
    })
    for layer in ("coral-offset", "tootsies-lettering"):
        ET.SubElement(outline, f"{{{NS}}}use", {"href": f"#{layer}"})
    root.insert(4, outline)

    subtitle.set("transform", "translate(60 0) scale(.92 1)")
    for path, (x, y, width, height) in zip(list(subtitle), LETTER_BOUNDS):
        center = x + width / 2
        position = (center - 750) / 513
        top = 617 + 76 * position ** 2
        angle = math.degrees(math.atan(152 * position / 513))
        wrapper = ET.Element(f"{{{NS}}}g", {
            "transform": (
                f"rotate({angle:.3f} {center:.3f} {top + height * .4:.3f}) "
                f"translate(0 {top - y * .8:.3f}) scale(1 .8)"
            ),
        })
        subtitle.remove(path)
        wrapper.append(path)
        subtitle.append(wrapper)
    ink = root.find(f"{{{NS}}}g[@id='printed-ink-flecks']")
    if ink is not None:
        ink.set("clip-path", "url(#tootsies-name-ink)")
    ET.indent(root, space="  ")
    return ET.tostring(root, encoding="unicode") + "\n"


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[1]
    for suffix in ("", "-small"):
        path = root / f"images/tootsies-matchbook-wordmark{suffix}.svg"
        path.write_text(add_ribbon(path.read_text()))
        print(path)
