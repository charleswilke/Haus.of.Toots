# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy>=2", "pillow>=11", "scipy>=1.14", "vtracer==0.6.15"]
# ///
"""Extract the approved matchbook's printed lettering as transparent SVG paths.

Run: uv run tools/gen-tootsies-matchbook-wordmark.py
Paper, cover edges, staple and striker are excluded. Letter contours, counters,
coral registration and a restrained selection of real ink flecks are preserved.
"""

from io import BytesIO
from pathlib import Path
import xml.etree.ElementTree as ET

import numpy as np
from PIL import Image
from scipy import ndimage as ndi
import vtracer


ROOT = Path(__file__).resolve().parents[1]
NS = "{http://www.w3.org/2000/svg}"


def components(mask, minimum):
    labels, _ = ndi.label(mask)
    keep = np.bincount(labels.ravel()) >= minimum
    keep[0] = False
    return keep[labels]


def paint_silhouette(mask):
    # Close pinholes in the printed ink while keeping all letter counters open.
    mask = ndi.binary_closing(mask, iterations=1)
    holes, _ = ndi.label(~mask)
    small_holes = np.bincount(holes.ravel()) < 60
    small_holes[0] = False
    return components(mask | small_holes[holes], 100)


def trace(mask, texture=False):
    image = Image.fromarray(np.uint8(~mask) * 255).convert("RGB")
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    svg = vtracer.convert_raw_image_to_svg(
        buffer.getvalue(), img_format="png", colormode="binary", mode="spline",
        filter_speckle=3 if texture else 8, corner_threshold=80,
        length_threshold=3.5, splice_threshold=45, path_precision=2,
    )
    paths = []
    for path in ET.fromstring(svg).findall(f"{NS}path"):
        attrs = " ".join(
            f'{key}="{value}"' for key, value in path.attrib.items() if key != "fill"
        )
        paths.append(f"    <path {attrs}/>")
    return "\n".join(paths)


def main():
    source = ROOT / "docs/artwork/tootsies-matchbook-reference.png"
    pixels = np.asarray(Image.open(source).convert("RGBA"), dtype=float)
    if pixels.shape[:2] != (1041, 1511):
        raise ValueError("Use the approved 1511 x 1041 matchbook reference.")
    rgb = pixels[:, :, :3]
    red, green, blue = rgb.transpose(2, 0, 1)
    y, x = np.indices(red.shape)
    cover = (y >= 110) & (y < 785) & (x >= 82) & (x < 1440)
    purple_pixels = (red - green > 15) & (blue - green > 15) & (green < 145) & cover
    coral_pixels = (
        (red - green > 45) & (red - blue > 40) & (green < 190) & (blue < 195)
        & cover & (y >= 145) & (y < 700)
    )
    purple = paint_silhouette(purple_pixels)
    coral = paint_silhouette(components(coral_pixels, 1000))
    labels, _ = ndi.label(purple)
    subtitle_ids = [
        index for index, region in enumerate(ndi.find_objects(labels), start=1)
        if region is not None and region[0].start > 580
    ]
    subtitle = np.isin(labels, subtitle_ids)
    name = purple & ~subtitle

    # Keep actual ink flecks as low-contrast vector highlights. Avoid carrying
    # the source paper grain or tracing thousands of invisible pigment dots.
    luminance = rgb @ np.array([0.2126, 0.7152, 0.0722])
    average = ndi.gaussian_filter(luminance * purple, 4) / np.maximum(
        ndi.gaussian_filter(purple.astype(float), 4), 0.01,
    )
    candidate = (luminance - average > 15) & ndi.binary_erosion(purple, iterations=3)
    fleck_labels, _ = ndi.label(candidate)
    areas = np.bincount(fleck_labels.ravel())
    eligible = np.flatnonzero((areas >= 5) & (areas <= 100))
    eligible = eligible[eligible != 0]
    selected = eligible[np.argsort(areas[eligible])[-180:]]
    texture = np.isin(fleck_labels, selected)

    yy, xx = np.where(purple | coral)
    left, top = int(xx.min()) - 24, int(yy.min()) - 24
    width, height = int(xx.max()) - left + 25, int(yy.max()) - top + 25
    base = (
        f'  <g id="coral-offset" fill="#FF817D">\n{trace(coral)}\n  </g>\n'
        f'  <g id="tootsies-lettering" fill="#59134F">\n{trace(name)}\n  </g>\n'
        f'  <g id="tattoo-parlor-lettering" fill="#59134F">\n{trace(subtitle)}\n  </g>'
    )
    ink = (
        '  <g id="printed-ink-flecks" fill="#FAF8F5" opacity="0.20" '
        'aria-hidden="true" pointer-events="none">\n'
        f'{trace(texture, texture=True)}\n  </g>'
    )
    for suffix, detail in [("", ink), ("-small", "")]:
        svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{left} {top} {width} {height}" '
            f'width="{width}" height="{height}" role="img" '
            'aria-labelledby="parlor-title parlor-description">\n'
            '  <title id="parlor-title">Tootsie’s Tattoo Parlor</title>\n'
            '  <desc id="parlor-description">Expressive purple poster lettering with '
            'a coral printed offset, above Tattoo Parlor. Adapted from a vintage '
            'matchbook cover.</desc>\n'
            '  <!-- Transparent; outlined lettering only, with no fonts or raster images. -->\n'
            f'{base}\n{detail}\n</svg>\n'
        )
        path = ROOT / f"images/tootsies-matchbook-wordmark{suffix}.svg"
        path.write_text(svg)
        print(f"{path}: {width} x {height}; {len(svg.encode()):,} bytes; {svg.count('<path ')} paths")


if __name__ == "__main__":
    main()
