"""Rebuild the eye-level Village illustration from its editable storefront source.
Run with Python and svgpathtools installed. This is an artwork authoring tool,
not a dependency of the site build. All output remains native SVG.
"""
from pathlib import Path
import math
import xml.etree.ElementTree as ET
from svgpathtools import parse_path

ROOT = Path(__file__).resolve().parents[1]
source = (ROOT / 'docs/artwork/village-storefronts.svg').read_text()
root = ET.fromstring(source)
ns = '{http://www.w3.org/2000/svg}'
window = root.find(f'{ns}defs/{ns}g[@id="window"]')
# Storefront order, first front-wall color, ground level, distance, width in world space, side color.
models = [
 ('American Girl', '#d6a7ad', 197, 0, 120, '#c5a2a9', 166),
 ('Toys R Us', '#a37e6a', 118, 175, 160, '#97745f', 196),
 ('JOANN', '#a9bab1', 172, 400, 170, '#829e96', 160),
 ('Container Store', '#e6d4c4', 139, 650, 210, '#bdc5c6', 167),
 ('Sephora', '#77717a', 150, 930, 240, '#68646b', 153),
 ('Costco', '#c6b2aa', 146, 1250, 290, '#b2948f', 174),
]
# The viewer's eye line is below every roof. Every front-wall horizontal
# projects to this exact vanishing point; vertical edges remain vertical.
HORIZON = 220
VANISH_X = 1252

def project(u, height):
    return complex(VANISH_X - 685200 / (u + 600), HORIZON + (48000 - 672 * height) / (u + 600))

def polygon(points):
    return 'M' + ' '.join(f'{p.real:.2f},{p.imag:.2f}' for p in points) + 'Z'

out = [source[:source.index('  <!-- One vanishing point')]]
out.append('''  <!-- Street-level perspective: all front-wall horizontals meet at (1252, 220).
       Roof top surfaces are hidden; only the facades and shaded return walls show. -->
  <path fill="#c2cbb5" d="M0 225h1440v75H0Z"/>
  <path fill="#e8d9d5" d="M0 300 1240 220h17L230 300Z"/>
  <path fill="#f6e9df" d="m1250 220 7 1L340 300H200Z"/>
  <!-- A single road follows the storefront curb; the old right lane is grass. -->
  <path fill="#a89bab" d="m1257 220-307 80H340Z"/>
  <path fill="#f6e9df" d="m1257 220-289 80h-18Z"/>
  <path fill="#c2cbb5" d="m1257 220 183 5v75H968Z"/>
  <path fill="#b5c5aa" d="m1325 240 115 20v40h-275Z"/>
''')
clip_count = 0
# Paint from the horizon toward the viewer so nearer stores occlude farther ones.
for name, first_fill, baseline, start, span, side, width in reversed(models):
    group = next(g for g in root.findall(f'{ns}g') if g.get('transform', '').startswith('matrix') and any(c.get('fill') == first_fill for c in g))
    children = list(group)
    first = next(i for i, c in enumerate(children) if c.get('fill') == first_fill)
    children = children[first:]
    roof_mode = False
    def point(z):
        if roof_mode:
            # The slatted mansard slopes OUT toward its lower eave. Slats and
            # trim use this same surface, so they recede together up the roof.
            depth = max(0, min(1, (z.imag - 8) / 30))
            x = 98 + (z.real - 98) * (1 + .075 * depth)
            u = start + x * span / width
            return project(u, baseline-z.imag) + complex(18,3) * (600/(u+600)) * depth
        return project(start + z.real * span / width, baseline - z.imag)
    def shape(d, dx=0, dy=0):
        path = parse_path(d)
        pieces = []
        for sub in path.continuous_subpaths():
            points = []
            for segment in sub:
                # Sample curves before projection, so arches stay smoothly curved.
                steps = 1 if segment.__class__.__name__ == 'Line' else 16
                for k in range(steps):
                    points.append(point(segment.point(k / steps) + complex(dx,dy)))
            points.append(point(sub[-1].end + complex(dx,dy)))
            part = 'M' + ' '.join(f'{p.real:.2f},{p.imag:.2f}' for p in points)
            if sub.isclosed(): part += 'Z'
            pieces.append(part)
        return ' '.join(pieces)
    out.append(f'  <!-- {name}: projected facade, with an eye-level return wall. -->')
    # Back corners move toward a separate left-hand vanishing point. The upper
    # wall edge sits BELOW the front parapet: it cannot expose a roof top.
    wall_top = {'American Girl':12, 'Toys R Us':36, 'JOANN':28, 'Container Store':18, 'Sephora':5, 'Costco':38}[name]
    top = point(complex(0, wall_top))
    bottom = point(complex(0, baseline))
    building_depth = 62 * 600 / (start + 600)
    depth = building_depth
    back_top = complex(top.real-depth, HORIZON+(top.imag-HORIZON)*.9)
    back_bottom = complex(bottom.real-depth, HORIZON+(bottom.imag-HORIZON)*.9)
    out.append(f'  <path fill="{side}" d="{polygon([top,back_top,back_bottom,bottom])}"/>')
    # Two bays along the deeper return make the occupied building volume legible.
    for frac in [.34, .66]:
        for bay_left, bay_right in [(.14,.40),(.58,.84)]:
            corners=[]
            for x,t in [(bay_left,frac),(bay_right,frac),(bay_right,frac+.12),(bay_left,frac+.12)]:
                f=top+(bottom-top)*t; b=back_top+(back_bottom-back_top)*t
                corners.append(f+(b-f)*x)
            out.append(f'  <path fill="{("#a8a19b" if name=="Sephora" else "#8c9fa6")}" d="{polygon(corners)}"/>')
    if name == 'JOANN':
        # Sweep the rounded shoulder through the building's depth. Its rear
        # curve peeks out above the return wall instead of ending at a flat edge.
        shoulder=parse_path('M10 28Q17 7 80 1')
        front_curve=[point(shoulder.point(i/24)) for i in range(25)]
        rear_curve=[complex(p.real-building_depth,HORIZON+(p.imag-HORIZON)*.9) for p in front_curve]
        out.append(f'  <path fill="#91aa9c" d="{polygon(front_curve+list(reversed(rear_curve)))}"/>')
        ridge='M'+' '.join(f'{p.real:.2f},{p.imag:.2f}' for p in rear_curve)
        out.append(f'  <path fill="none" stroke="#718f83" stroke-width="{3*600/(start+600):.2f}" stroke-linecap="round" d="{ridge}"/>')
        # A soft inner contour gives the rounded side the same layered trim as the front.
        inner=[p+complex(0,3*600/(start+600)) for p in rear_curve]
        trim='M'+' '.join(f'{p.real:.2f},{p.imag:.2f}' for p in inner)
        out.append(f'  <path fill="none" stroke="#c6d1b9" stroke-width=".8" d="{trim}"/>')
    # Carry each facade's roof/cornice around the return wall. These are
    # vertical fascia faces, not roof-top planes, preserving the low viewpoint.
    returns = {
        'American Girl': [],  # One joined beveled return, drawn below.,
        'JOANN': [],  # The curved return is drawn as a swept profile below.
        'Container Store': [(-5,17,25,'#6f8da7')],
        'Sephora': [(-4,0,11,'#68646b')],
        'Costco': [(-3,34,41,'#9e6f80'), (10,17,25,'#ad7e8c'), (42,-4,5,'#ad7e8c')],
    }
    if name == 'American Girl':
        # Match the front bevel's actual sloping left edge with one continuous
        # return, avoiding a detached wedge where several trim strips meet.
        upper=point(complex(-4,3)); lower=point(complex(1,13))
        rear_upper=complex(upper.real-building_depth*1.1,HORIZON+(upper.imag-HORIZON)*.9)
        rear_lower=complex(lower.real-building_depth*1.1,HORIZON+(lower.imag-HORIZON)*.9)
        out.append(f'  <path fill="#b6a6a5" d="{polygon([upper,rear_upper,rear_lower,lower])}"/>')
        out.append(f'  <path stroke="#d1c3b9" stroke-width=".5" d="M{rear_upper.real:.2f},{rear_upper.imag:.2f} L{upper.real:.2f},{upper.imag:.2f}"/>')
    for x, y_top, y_bottom, color in returns.get(name, []):
        edge_top, edge_bottom = point(complex(x,y_top)), point(complex(x,y_bottom))
        rear_top=complex(edge_top.real-depth*1.12,HORIZON+(edge_top.imag-HORIZON)*.9)
        rear_bottom=complex(edge_bottom.real-depth*1.12,HORIZON+(edge_bottom.imag-HORIZON)*.9)
        out.append(f'  <path fill="{color}" d="{polygon([edge_top,rear_top,rear_bottom,edge_bottom])}"/>')
        out.append(f'  <path stroke="#eaded5" stroke-opacity=".5" stroke-width=".7" d="M{rear_top.real:.2f},{rear_top.imag:.2f} L{edge_top.real:.2f},{edge_top.imag:.2f}"/>')
        out.append(f'  <path stroke="{side}" stroke-width="1.1" d="M{rear_bottom.real:.2f},{rear_bottom.imag:.2f} L{edge_bottom.real:.2f},{edge_bottom.imag:.2f}"/>')
    def emit(el, inherited=None, dx=0,dy=0):
        global clip_count, roof_mode
        attrs = dict(inherited or {})
        attrs.update({k:v for k,v in el.attrib.items() if k in ['fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','fill-opacity']})
        tag = el.tag.removeprefix(ns)
        if tag=='g' and el.get('id') == 'toys-sloped-roof':
            # Cast a soft shadow onto the wall beneath the projecting eave.
            shadow=[point(complex(-4,42)),point(complex(200,42)),point(complex(200,52)),point(complex(-4,52))]
            out.append(f'  <path fill="#6d594e" fill-opacity=".18" d="{polygon(shadow)}"/>')
            roof_mode = True
            for child in el: emit(child,attrs,dx,dy)
            roof_mode = False
            return
        if tag=='g' and el.get('id') == 'joann-projecting-awning':
            return  # Draw the projecting canopy in front of the doors below.
        if tag=='g':
            for child in el: emit(child,attrs,dx,dy)
        elif tag=='use':
            for child in window: emit(child,attrs,dx+float(el.get('x',0)),dy+float(el.get('y',0)))
        elif tag=='path':
            d=shape(el.get('d'),dx,dy)
            pattern=attrs.get('fill','')
            if pattern.startswith('url('):
                clip_count+=1
                cid=f'facade-clip-{clip_count}'
                if pattern == 'url(#toy-roof)':
                    # Extend the slatted roof back over the return wall; the
                    # wall ends under the eave rather than poking through it.
                    upper=point(complex(-2,21)); lower=point(complex(-9,38))
                    reach=building_depth*1.06
                    rear_upper=upper+complex(-reach,1)
                    rear_lower=lower+complex(-reach,-1)
                    out.append(f'  <path fill="#9a7962" d="{polygon([upper,rear_upper,rear_lower,lower])}"/>')
                    for t in [.22,.48,.74]:
                        front=upper+(lower-upper)*t
                        rear=rear_upper+(rear_lower-rear_upper)*t
                        out.append(f'  <path stroke="#806550" stroke-width="1" d="M{rear.real:.2f},{rear.imag:.2f} L{front.real:.2f},{front.imag:.2f}"/>')
                    # Exposed vertical/sloping tier returns, with no visible top planes.
                    for x in [31,77,143]:
                        top = point(complex(x,8))
                        foot = point(complex(x-5,21))
                        depth = 10 * 600/(start+600)
                        back_top = complex(top.real-depth,HORIZON+(top.imag-HORIZON)*.975)
                        back_foot = complex(foot.real-depth,HORIZON+(foot.imag-HORIZON)*.975)
                        out.append(f'  <path fill="#8b6c59" d="{polygon([top,back_top,back_foot,foot])}"/>')
                    lip_top=point(complex(-9,38)); lip_bottom=point(complex(-9,44))
                    back_top=complex(lip_top.real-building_depth,HORIZON+(lip_top.imag-HORIZON)*.975)
                    back_bottom=complex(lip_bottom.real-building_depth,HORIZON+(lip_bottom.imag-HORIZON)*.975)
                    out.append(f'  <path fill="#755d50" d="{polygon([lip_top,back_top,back_bottom,lip_bottom])}"/>')
                out.append(f'  <defs><clipPath id="{cid}"><path d="{d}"/></clipPath></defs><g clip-path="url(#{cid})">')
                if pattern=='url(#toy-roof)':
                    colors=['#b58e77','#96765f']
                    for y in range(-7,49,7):
                        for off,h,color in [(0,5,colors[0]),(5,2,colors[1])]:
                            pts=[complex(-40,y+off),complex(215,y+off),complex(215,y+off+h),complex(-40,y+off+h)]
                            out.append(f'  <path fill="{color}" d="{polygon([point(p) for p in pts])}"/>')
                else:
                    is_toy=pattern=='url(#toy-stripes)'
                    colors=['#cf7e88','#6ea6a0','#e3c777','#8cb4b4','#d8a3b4','#849db9'] if is_toy else ['#f7efdf','#8da879']
                    stripe=3 if is_toy else 13
                    for x in range(-60,240,stripe):
                        skew=0 if is_toy else -math.tan(math.radians(12))
                        pts=[complex(x+skew*y,y) for x,y in [(x,0),(x+stripe,0),(x+stripe,180),(x,180)]]
                        color=colors[(x//stripe)%len(colors)]
                        out.append(f'  <path fill="{color}" d="{polygon([point(p) for p in pts])}"/>')
                out.append('  </g>')
            else:
                if 'stroke-width' in attrs: attrs['stroke-width']=f'{float(attrs["stroke-width"])*600/(start+600):.2f}'
                a=' '.join(f'{k}="{v}"' for k,v in attrs.items())
                out.append(f'  <path {a} d="{d}"/>')
    for child in children: emit(child)
    if name == 'JOANN':
        # Fabric depth is a separate direction from the facade's horizontal axis.
        # Each stripe follows an outward ray, not a skew painted on the front wall.
        def canopy(x, depth):
            u = start + x * span / width
            scale = 600 / (u + 600)
            return point(complex(x, 94 + 18 * depth)) + complex(30, 4) * scale * depth
        back_l, back_r = canopy(7,0), canopy(153,0)
        front_l, front_r = canopy(7,1), canopy(153,1)
        out.append('  <!-- Projecting JOANN canopy: receding fabric stripes, shaded side and hanging valance. -->')
        shadow = [point(complex(7,116)),point(complex(153,116)),front_r+complex(0,7),front_l+complex(0,7)]
        out.append(f'  <path fill="#627d70" fill-opacity=".16" d="{polygon(shadow)}"/>')
        out.append(f'  <path fill="#6f8d66" d="{polygon([back_l,front_l,front_l+complex(0,4),point(complex(7,122))])}"/>')
        for i in range(12):
            a,b = 7 + 146*i/12, 7 + 146*(i+1)/12
            color = ['#f7efdf','#8da879'][i%2]
            pts = [canopy(a,0),canopy(b,0),canopy(b,1),canopy(a,1)]
            out.append(f'  <path fill="{color}" d="{polygon(pts)}"/>')
            left, right = canopy(a,1), canopy(b,1)
            # A small curved hem follows the SAME stripe at the projecting edge.
            mid=(left+right)/2+complex(0,5)
            d=f'M{left.real:.2f},{left.imag:.2f} L{right.real:.2f},{right.imag:.2f} l0,3 Q{mid.real:.2f},{mid.imag:.2f} {left.real:.2f},{left.imag+3:.2f}Z'
            out.append(f'  <path fill="{color}" d="{d}"/>')
        out.append(f'  <path stroke="#f7efdf" stroke-width=".7" d="M{back_l.real:.2f},{back_l.imag:.2f} L{back_r.real:.2f},{back_r.imag:.2f}"/>')
# Trees stand upright with bases anchored to the same ground plane.
for u in [147,367,609,895,1210,1610]:
    p=project(u,0);scale=600/(u+600)
    out.append(f'  <use href="#tree" transform="translate({p.real:.2f} {p.imag-52*scale:.2f}) scale({scale:.3f})"/>')
# Layered evergreens close the right edge behind the foreground welcome sign.
out.append('''  <defs>
    <g id="village-pine">
      <path fill="currentColor" d="M0 0-20 35h10l-24 35h16l-30 43h34v24h12v-24h34L18 70h16L10 35h10Z"/>
      <path stroke="#6e8e7d" stroke-width="2" stroke-opacity=".3" d="M0 51v84"/>
    </g>
  </defs>
  <g aria-hidden="true">
    <use href="#village-pine" color="#cbd5bd" transform="translate(1288 138) scale(.75)"/>
    <use href="#village-pine" color="#bdccb6" transform="translate(1355 83) scale(1.25)"/>
    <use href="#village-pine" color="#a5bca7" transform="translate(1434 43) scale(1.65)"/>
    <use href="#village-pine" color="#a9bfa8" transform="translate(1309 149) scale(.9)"/>
    <use href="#village-pine" color="#89a592" transform="translate(1399 108) scale(1.32)"/>
    <use href="#village-pine" color="#789889" transform="translate(1465 105) scale(1.48)"/>
  </g>''')
out.append('''  <path fill="#aec0a5" d="M0 283q19-23 39-3 19-32 45-9 23-22 46 0 24-20 43 2 20-7 34 9 15-2 20 10v8H0Z"/>
  <path fill="#aec0a5" d="m1340 244q18-21 34-2 20-19 38 1 14-14 28-5v46Z"/>
</svg>''')
(ROOT/'images/village-streetscape.svg').write_text('\n'.join(out)+'\n')
