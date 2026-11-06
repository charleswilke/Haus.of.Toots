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
 ('American Girl', '#eac9bd', 197, 0, 120, '#c9b0a6', 166),
 ('Toys R Us', '#a37e6a', 118, 156, 198.4, '#97745f', 196),
 ('JOANN', '#a9bab1', 172, 400, 190, '#829e96', 160),
 ('Container Store', '#e6d4c4', 139, 650, 240, '#bdc5c6', 167),
 ('Sephora', '#77717a', 150, 930, 240, '#68646b', 153),
 ('Costco', '#c6b2aa', 146, 1250, 700, '#b2948f', 174),
]
# The viewer's eye line is below every roof. Every front-wall horizontal
# projects to this exact vanishing point; vertical edges remain vertical.
HORIZON = 220
VANISH_X = 1252

def project(u, height):
    return complex(VANISH_X - 685200 / (u + 600), HORIZON + (48000 - 672 * height) / (u + 600))

def polygon(points):
    return 'M' + ' '.join(f'{p.real:.2f},{p.imag:.2f}' for p in points) + 'Z'

def road_point(x_at_base, y):
    depth = (y - HORIZON) / (300 - HORIZON)
    return complex(VANISH_X + (x_at_base - VANISH_X) * depth, y)

def lane_markings(dashes):
    # Center the paint between the road edges at x=340 and x=950.
    return ' '.join(
        polygon([road_point(635, far), road_point(655, far),
                 road_point(655, near), road_point(635, near)])
        for far, near in dashes
    )

lane_paint = {'fill': '#f6e9df', 'fill-opacity': '.65'}
out = [source[:source.index('  <!-- One vanishing point')]]
out.append(f'''  <!-- Street-level perspective: the road and front-wall horizontals meet at ({VANISH_X}, {HORIZON}).
       Roof top surfaces are hidden; only the facades and shaded return walls show. -->
  <path fill="#c2cbb5" d="M0 225h1440v75H0Z"/>
  <path fill="#e8d9d5" d="M0 300 1240 {HORIZON}H{VANISH_X}L230 300Z"/>
  <path fill="#f6e9df" d="M1250 {HORIZON}H{VANISH_X}L340 300H200Z"/>
  <path fill="#a89bab" d="M{VANISH_X} {HORIZON} 950 300H340Z"/>
  <path fill="#f6e9df" d="M{VANISH_X} {HORIZON} 968 300H950Z"/>
  <path fill="#c2cbb5" d="M{VANISH_X} {HORIZON} 1440 225v75H968Z"/>
  <path fill="#b5c5aa" d="m1325 240 115 20v40h-275Z"/>
''')
lane = lane_markings([(248.5, 250.5), (253, 256), (259, 263), (267, 272), (277, 283), (290, 299)])
out.append(f'  <path fill="{lane_paint["fill"]}" fill-opacity="{lane_paint["fill-opacity"]}" d="{lane}"/>')
clip_count = 0
# Paint from the horizon toward the viewer so nearer stores occlude farther ones.
for name, first_fill, baseline, start, span, side, width in reversed(models):
    group = next(g for g in root.findall(f'{ns}g') if g.get('transform', '').startswith('matrix') and any(c.get('fill') == first_fill for c in g))
    children = list(group)
    first = next(i for i, c in enumerate(children) if c.get('fill') == first_fill)
    children = children[first:]
    roof_mode = False
    height_scale = {'Costco': 1.55, 'Toys R Us': 1.24, 'JOANN': 1.40, 'Container Store': 1.12}.get(name, 1)
    def point(z):
        if roof_mode:
            # The slatted mansard slopes OUT toward its lower eave. Slats and
            # trim use this same surface, so they recede together up the roof.
            depth = max(0, min(1, (z.imag + 8) / 46))
            x = 98 + (z.real - 98) * (1 + .075 * depth)
            u = start + x * span / width
            # Taper the horizontal projection from the final bay's inner seam
            # to the right edge so the eave ends close to the storefront wall.
            right_bay = max(0, min(1, (z.real - 118) / (200 - 118)))
            return project(u, (baseline-z.imag) * height_scale) + complex(18*(1-right_bay),3) * height_scale * (600/(u+600)) * depth
        # Scale from the curb, preserving the street's vanishing point.
        return project(start + z.real * span / width, (baseline - z.imag) * height_scale)
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
    if name == 'American Girl':
        out.append('  <g transform="translate(20 0)">')
    out.append(f'  <!-- {name}: projected facade, with an eye-level return wall. -->')
    # Back corners move toward a separate left-hand vanishing point. The upper
    # wall edge sits BELOW the front parapet: it cannot expose a roof top.
    wall_top = {'American Girl':22, 'Toys R Us':36, 'JOANN':28, 'Container Store':18, 'Sephora':5, 'Costco':38}[name]
    wall_left = 20 if name == 'American Girl' else 0
    top = point(complex(wall_left, wall_top))
    bottom = point(complex(wall_left, baseline))
    building_depth = 62 * 600 / (start + 600) * height_scale
    depth = building_depth
    back_top = complex(top.real-depth, HORIZON+(top.imag-HORIZON)*.9)
    back_bottom = complex(bottom.real-depth, HORIZON+(bottom.imag-HORIZON)*.9)
    if name == 'Costco':
        # Each raised tier needs an occupied return beneath its cornice.
        # Use the same rear projection for wall and trim so the edges meet.
        for x, upper, lower in [(0,38,146), (14,21,38), (47,0,21)]:
            front_top, front_bottom = point(complex(x,upper)), point(complex(x,lower))
            rear_top = complex(front_top.real-depth, HORIZON+(front_top.imag-HORIZON)*.9)
            rear_bottom = complex(front_bottom.real-depth, HORIZON+(front_bottom.imag-HORIZON)*.9)
            out.append(f'  <path fill="{side}" d="{polygon([front_top,rear_top,rear_bottom,front_bottom])}"/>')
    else:
        out.append(f'  <path fill="{side}" d="{polygon([top,back_top,back_bottom,bottom])}"/>')
    def return_window(left, right, upper, lower, fill):
        corners=[]
        for x,t in [(left,upper),(right,upper),(right,lower),(left,lower)]:
            front=top+(bottom-top)*t
            rear=back_top+(back_bottom-back_top)*t
            corners.append(front+(rear-front)*x)
        out.append(f'  <path fill="{fill}" d="{polygon(corners)}"/>')
    if name == 'Costco':
        # Two full-height display windows replace the four tiny upper bays.
        # Their frames follow the return wall, with glass at storefront scale.
        for left, right in [(.10,.45),(.55,.90)]:
            return_window(left,right,.39,1,'#e8dfd3')
            return_window(left+.05,right-.05,.45,.96,'#8c9fa6')
    else:
        # Smaller upper bays suit the other storefronts' return walls.
        for frac in [.34, .66]:
            for left, right in [(.14,.40),(.58,.84)]:
                return_window(left,right,frac,frac+.12,'#a8a19b' if name=='Sephora' else '#8c9fa6')
    if name == 'Container Store':
        # The shallow gable continues over the shop, with its ridge running
        # toward the same rear corners as the return wall.
        eave = point(complex(-5,17))
        peak = point(complex(84,0))
        def roof_back(p):
            return complex(p.real-building_depth*1.12,HORIZON+(p.imag-HORIZON)*.9)
        rear_eave, rear_peak = roof_back(eave), roof_back(peak)
        out.append(f'  <path fill="#6f8da7" d="{polygon([eave,rear_eave,rear_peak,peak])}"/>')
        out.append(f'  <path fill="none" stroke="#a8bdce" stroke-width=".8" stroke-linejoin="round" d="M{rear_eave.real:.2f},{rear_eave.imag:.2f} L{rear_peak.real:.2f},{rear_peak.imag:.2f} L{peak.real:.2f},{peak.imag:.2f}"/>')
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
        upper=point(complex(16,13)); lower=point(complex(19,23))
        rear_upper=complex(upper.real-building_depth*1.1,HORIZON+(upper.imag-HORIZON)*.9)
        rear_lower=complex(lower.real-building_depth*1.1,HORIZON+(lower.imag-HORIZON)*.9)
        out.append(f'  <path fill="#b6a6a5" d="{polygon([upper,rear_upper,rear_lower,lower])}"/>')
        out.append(f'  <path stroke="#d1c3b9" stroke-width=".5" d="M{rear_upper.real:.2f},{rear_upper.imag:.2f} L{upper.real:.2f},{upper.imag:.2f}"/>')
    for x, y_top, y_bottom, color in returns.get(name, []):
        edge_top, edge_bottom = point(complex(x,y_top)), point(complex(x,y_bottom))
        return_depth = depth if name == 'Costco' else depth*1.12
        rear_top=complex(edge_top.real-return_depth,HORIZON+(edge_top.imag-HORIZON)*.9)
        rear_bottom=complex(edge_bottom.real-return_depth,HORIZON+(edge_bottom.imag-HORIZON)*.9)
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
            # Wrap the near bay and its fascia over the return wall. Match the
            # front shingle courses where they cross the corner.
            ridge = complex(4,3)
            eave = complex(-9,38)
            def roof_back(p):
                return complex(p.real-building_depth*1.06, HORIZON+(p.imag-HORIZON)*.9)
            upper, lower = point(ridge), point(eave)
            return_color = el.find(f'{ns}path[@id="toys-roof-return"]').get('fill')
            out.append(f'  <path fill="{return_color}" d="{polygon([upper,roof_back(upper),roof_back(lower),lower])}"/>')
            for y in range(9,38,5):
                front = point(ridge+(eave-ridge)*(y-ridge.imag)/(eave.imag-ridge.imag))
                rear = roof_back(front)
                out.append(f'  <path stroke="#71615c" stroke-width=".85" d="M{rear.real:.2f},{rear.imag:.2f} L{front.real:.2f},{front.imag:.2f}"/>')
            lip = point(complex(-9,44))
            out.append(f'  <path fill="#61514d" d="{polygon([lower,roof_back(lower),roof_back(lip),lip])}"/>')
            for child in el:
                if child.get('id') != 'toys-roof-return':
                    emit(child,attrs,dx,dy)
            roof_mode = False
            return
        if tag=='g' and el.get('id') in ['joann-projecting-awning', 'container-projecting-awnings', 'american-girl-projecting-awnings', 'costco-projecting-awnings']:
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
                    roof_fill, seam_fill = [band.get('fill') for band in root.find(f'{ns}defs/{ns}pattern[@id="toy-roof"]')]
                    out.append(f'  <path fill="{roof_fill}" d="{d}"/>')
                out.append(f'  <defs><clipPath id="{cid}"><path d="{d}"/></clipPath></defs><g clip-path="url(#{cid})">')
                if pattern=='url(#toy-roof)':
                    for y in range(-6,38,5):
                        pts=[complex(-9,y),complex(200,y),complex(200,y+1),complex(-9,y+1)]
                        out.append(f'  <path fill="{seam_fill}" d="{polygon([point(p) for p in pts])}"/>')
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
    if name == 'Costco':
        # The canvas has red sloped window awnings and a blue entry canopy.
        # Project fabric outward from the wall, with a shaded side and valance.
        for left,right,y,drop,colors in [
            (9,37,72,12,('#b95c67','#8e4c59')),
            (139,167,72,12,('#b95c67','#8e4c59')),
            (54,121,78,9,('#6e90ae','#557894')),
        ]:
            def warehouse_canopy(x,t):
                u=start+x*span/width
                return point(complex(x,y+drop*t))+complex(12,2)*height_scale*(600/(u+600))*t
            back_l,back_r=warehouse_canopy(left,0),warehouse_canopy(right,0)
            front_l,front_r=warehouse_canopy(left,1),warehouse_canopy(right,1)
            hem=complex(0,3*height_scale*600/(start+600))
            shadow=[point(complex(left,y+drop)),point(complex(right,y+drop)),front_r+hem*2,front_l+hem*2]
            out.append(f'  <path fill="#705661" fill-opacity=".18" d="{polygon(shadow)}"/>')
            out.append(f'  <path fill="{colors[1]}" d="{polygon([back_l,front_l,front_l+hem,point(complex(left,y+drop+3))])}"/>')
            out.append(f'  <path fill="{colors[0]}" d="{polygon([back_l,back_r,front_r,front_l])}"/>')
            for i in range(1,6):
                x=left+(right-left)*i/6
                a,b=warehouse_canopy(x,0),warehouse_canopy(x,1)
                out.append(f'  <path stroke="{colors[1]}" stroke-width=".75" d="M{a.real:.2f},{a.imag:.2f} L{b.real:.2f},{b.imag:.2f}"/>')
            out.append(f'  <path fill="{colors[1]}" d="{polygon([front_l,front_r,front_r+hem,front_l+hem])}"/>')
    if name == 'American Girl':
        # Simple fabric wedges: the projection has its own depth direction,
        # independent of the facade, with a side panel and hanging front hem.
        for a,b,y in [(29,59,36),(68,98,36),(107,137,36),(29,74,85),(93,138,85),(27,139,136)]:
            def red_canopy(x,t):
                u=start+x*span/width
                return point(complex(x,y+7*t))+complex(11,1.5)*(600/(u+600))*t
            bl,br=red_canopy(a,0),red_canopy(b,0)
            fl,fr=red_canopy(a,1),red_canopy(b,1)
            hem=complex(0,3*600/(start+600))
            shadow=[point(complex(a,y+7)),point(complex(b,y+7)),fr+hem*2,fl+hem*2]
            out.append(f'  <path fill="#855a65" fill-opacity=".16" d="{polygon(shadow)}"/>')
            out.append(f'  <path fill="#a55f6b" d="{polygon([bl,fl,fl+hem,point(complex(a,y+10))])}"/>')
            out.append(f'  <path fill="#c9767d" d="{polygon([bl,br,fr,fl])}"/>')
            out.append(f'  <path fill="#ad626f" d="{polygon([fl,fr,fr+hem,fl+hem])}"/>')
            out.append(f'  <path fill="none" stroke="#df9b9b" stroke-width=".65" d="M{bl.real:.2f},{bl.imag:.2f} L{br.real:.2f},{br.imag:.2f}"/>')
    if name == 'Container Store':
        # A shallow canopy projects only a few pixels beyond the front wall.
        def blue_canopy(x, t):
            u=start+x*span/width
            return point(complex(x,58+8*t))+complex(12,1.5)*(600/(u+600))*t
        for a,b in [(12,68),(73,94),(99,155)]:
            back_l,back_r=blue_canopy(a,0),blue_canopy(b,0)
            front_l,front_r=blue_canopy(a,1),blue_canopy(b,1)
            shadow=[point(complex(a,66)),point(complex(b,66)),front_r+complex(0,3),front_l+complex(0,3)]
            out.append(f'  <path fill="#557894" fill-opacity=".18" d="{polygon(shadow)}"/>')
            out.append(f'  <path fill="#557894" d="{polygon([back_l,front_l,front_l+complex(0,2),point(complex(a,68))])}"/>')
            out.append(f'  <path fill="#6e90ae" d="{polygon([back_l,back_r,front_r,front_l])}"/>')
            out.append(f'  <path fill="#557894" d="{polygon([front_l,front_r,front_r+complex(0,2),front_l+complex(0,2)])}"/>')
            out.append(f'  <path stroke="#a2b9cc" stroke-width=".6" d="M{back_l.real:.2f},{back_l.imag:.2f} L{back_r.real:.2f},{back_r.imag:.2f}"/>')
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
        raised_corner = point(complex(7,116))
        shadow = [raised_corner,point(complex(153,116)),front_r+complex(0,7),front_l+complex(0,7)]
        out.append(f'  <path fill="#627d70" fill-opacity=".16" d="{polygon(shadow)}"/>')
        out.append(f'  <path fill="#6f8d66" d="{polygon([back_l,front_l,front_l+complex(0,3),raised_corner])}"/>')
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
    if name == 'American Girl':
        out.append('  </g>')
# Trees stand upright with bases anchored to the same ground plane.
for u in [147,367,609,895,1210,2020]:
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

# Separate abstract sky and proportion-preserving scenery for narrow layouts.
# This lets the header fill vertically without stretching the shop architecture.
ET.register_namespace('', 'http://www.w3.org/2000/svg')
finished = '\n'.join(out)+'\n'
for filename, sky_only in [('village-sky.svg', True), ('village-neighborhood.svg', False)]:
    layer = ET.fromstring(finished)
    reached_hills = False
    for child in list(layer):
        tag = child.tag.removeprefix(ns)
        if tag in ['defs', 'style']:
            continue
        if tag == 'path' and child.get('fill') == '#bdc6d3':
            reached_hills = True
        is_cloud = any('village-cloud' in el.get('class','') for el in child.iter())
        is_sun = tag == 'circle'
        if (sky_only and (reached_hills or is_sun or is_cloud)) or (not sky_only and (not reached_hills or is_cloud)):
            layer.remove(child)
    if sky_only:
        layer.set('preserveAspectRatio', 'none')
    (ROOT / 'images' / filename).write_text(ET.tostring(layer, encoding='unicode')+'\n')
    if not sky_only:
        # Extra foreground on phones places the sign on grass below the shops,
        # instead of shrinking the buildings or floating the sign in the sky.
        layer.set('viewBox', '0 0 1440 570')
        ET.SubElement(layer, ns+'path', {'fill':'#c2cbb5','d':'M0 300h1440v270H0Z'})
        for left, right, fill in [(340, 950, '#a89bab'), (950, 968, '#f6e9df')]:
            d = polygon([road_point(left, 300), road_point(right, 300),
                         road_point(right, 570), road_point(left, 570)])
            ET.SubElement(layer, ns+'path', {'fill':fill,'d':d})
        ET.SubElement(layer, ns+'path', {**lane_paint, 'd': lane_markings([(311, 323), (339, 356), (373, 396)])})
        (ROOT/'images/village-neighborhood-mobile.svg').write_text(ET.tostring(layer, encoding='unicode')+'\n')
