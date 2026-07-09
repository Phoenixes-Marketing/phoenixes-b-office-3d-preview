import fitz, json, math
from pathlib import Path

ROOT = Path('.')
PDF = ROOT / 'sources' / 'B_version_1.pdf'
OUT = ROOT / 'app' / 'public' / 'model-data.json'
ANALYSIS = ROOT / 'analysis' / 'model-data.json'

# Least-squares calibration from visible column/axis positions, based on the 5x render.
CM_PER_PT_X = 1.4110410330466734 * 5
CM_OFFSET_X = -545.1150419100508
CM_PER_PT_Z = 1.409363931616311 * 5
CM_OFFSET_Z = -333.639112386742

COLORS = {
    'orange': (0.963988721370697, 0.7179980278015137, 0.381994366645813),
    'red': (0.9099870324134827, 0.23399710655212402, 0.23498894274234772),
    'cyan': (0.69599449634552, 0.8659952878952026, 0.8609902858734131),
    'door_arc': (0.051987174898386, 0.19099704921245575, 0.547997236251831),
    'door_sill': (0.36199048161506653, 0.7689943909645081, 0.9449905157089233),
    'pink': (0.7759975790977478, 0.495994508266449, 0.7009994387626648),
    'wood': (0.7859922051429749, 0.6479896306991577, 0.5599908232688904),
    'blue': (0.6049897074699402, 0.6899977326393127, 0.8579995632171631),
    'green': (0.45198747515678406, 0.7469901442527771, 0.41998931765556335),
}


def same(a, b, tol=1e-6):
    return a and all(abs(a[i] - b[i]) <= tol for i in range(3))


def cmx(x):
    return x * CM_PER_PT_X + CM_OFFSET_X


def cmz(y):
    return y * CM_PER_PT_Z + CM_OFFSET_Z


def rect_to_cm(r):
    x0, x1 = sorted([cmx(r.x0), cmx(r.x1)])
    z0, z1 = sorted([cmz(r.y0), cmz(r.y1)])
    return [round(x0, 2), round(z0, 2), round(x1, 2), round(z1, 2)]


def add_rect(out, r, kind, source, min_cm=3):
    x0, z0, x1, z1 = rect_to_cm(r)
    if abs(x1 - x0) < min_cm or abs(z1 - z0) < min_cm:
        return
    out.append({'kind': kind, 'shape': 'rect', 'x0': x0, 'z0': z0, 'x1': x1, 'z1': z1, 'source': source})


def add_ring(out, outer, inner, kind, source):
    ox0, oz0, ox1, oz1 = rect_to_cm(outer)
    ix0, iz0, ix1, iz1 = rect_to_cm(inner)
    candidates = [
        (ox0, oz0, ox1, iz0),
        (ox0, iz1, ox1, oz1),
        (ox0, iz0, ix0, iz1),
        (ix1, iz0, ox1, iz1),
    ]
    for idx, (x0, z0, x1, z1) in enumerate(candidates):
        if abs(x1 - x0) >= 3 and abs(z1 - z0) >= 3:
            out.append({'kind': kind, 'shape': 'rect', 'x0': round(x0, 2), 'z0': round(z0, 2), 'x1': round(x1, 2), 'z1': round(z1, 2), 'source': f'{source}:{idx}'})


def bbox_from_points(points):
    xs = [p.x for p in points]
    ys = [p.y for p in points]
    return fitz.Rect(min(xs), min(ys), max(xs), max(ys))


def rect_area(r):
    return abs((r.x1 - r.x0) * (r.y1 - r.y0))


def point_key(p):
    return (round(p.x, 4), round(p.y, 4))


def point_to_cm(p):
    return {'x': round(cmx(p.x), 2), 'z': round(cmz(p.y), 2)}


def extract_door_arc(drawing, idx):
    lines = [it for it in drawing.get('items', []) if it[0] == 'l']
    if len(lines) < 2:
        return None

    counts = {}
    points = {}
    for _, a, b in lines[:2]:
        for p in (a, b):
            key = point_key(p)
            counts[key] = counts.get(key, 0) + 1
            points[key] = p

    common = [key for key, count in counts.items() if count >= 2]
    if not common:
        return None

    hinge = points[common[0]]
    ends = [points[key] for key, count in counts.items() if key != common[0]]
    if len(ends) != 2:
        return None

    r0 = math.hypot(cmx(ends[0].x) - cmx(hinge.x), cmz(ends[0].y) - cmz(hinge.y))
    r1 = math.hypot(cmx(ends[1].x) - cmx(hinge.x), cmz(ends[1].y) - cmz(hinge.y))
    radius = (r0 + r1) / 2
    if radius < 45:
        door_type = 'narrow'
    elif radius > 115:
        door_type = 'wide'
    else:
        door_type = 'standard'

    return {
        'kind': 'swing-door',
        'shape': 'arc',
        'hinge': point_to_cm(hinge),
        'endA': point_to_cm(ends[0]),
        'endB': point_to_cm(ends[1]),
        'radiusCm': round(radius, 2),
        'type': door_type,
        'source': f'door-arc-{idx}',
    }


def extract_orange(drawing, idx, walls):
    items = drawing.get('items', [])
    rect_items = [it[1] for it in items if it[0] == 're']
    if len(rect_items) == 1:
        add_rect(walls, rect_items[0], 'wall', f'orange-{idx}')
        return
    if len(rect_items) == 2:
        outer, inner = sorted(rect_items, key=rect_area, reverse=True)
        add_ring(walls, outer, inner, 'wall', f'orange-ring-{idx}')
        return
    # Many non-rect orange items are paired outlines. Split the points into two paths when possible.
    line_points = []
    for it in items:
        if it[0] == 'l':
            line_points.extend([it[1], it[2]])
    if len(line_points) >= 8:
        line_items = [it for it in items if it[0] == 'l']
        xs = sorted({round(p.x, 4) for p in line_points})
        ys = sorted({round(p.y, 4) for p in line_points})
        if len(line_items) == 8 and len(xs) == 3 and len(ys) == 4:
            x0, x1, x2 = xs
            y0, y1, y2, y3 = ys
            pieces = [
                fitz.Rect(x0, y0, x2, y1),
                fitz.Rect(x0, y2, x2, y3),
                fitz.Rect(x1, y1, x2, y2),
            ]
            for piece_idx, piece in enumerate(pieces):
                add_rect(walls, piece, 'wall', f'orange-outline-{idx}:{piece_idx}', min_cm=3)
            return
        # The conference-room outline uses two nested loops with 5 lines each.
        if len(items) >= 10:
            first = []
            second = []
            for it in items[:5]:
                if it[0] == 'l': first.extend([it[1], it[2]])
            for it in items[5:10]:
                if it[0] == 'l': second.extend([it[1], it[2]])
            if first and second:
                r1 = bbox_from_points(first)
                r2 = bbox_from_points(second)
                outer, inner = sorted([r1, r2], key=rect_area, reverse=True)
                add_ring(walls, outer, inner, 'wall', f'orange-poly-ring-{idx}')
                return
        # Otherwise approximate a long slanted wall by a segment through the bounding box diagonal.
        r = bbox_from_points(line_points)
        x0, z0 = cmx(r.x0), cmz(r.y0)
        x1, z1 = cmx(r.x1), cmz(r.y1)
        if abs(z1 - z0) > abs(x1 - x0):
            cx0 = (cmx(r.x0) + cmx(r.x1)) / 2
            thickness = abs(cmx(r.x1) - cmx(r.x0))
            if thickness <= 80:
                walls.append({'kind': 'wall', 'shape': 'segment', 'x0': round(cx0, 2), 'z0': round(z0, 2), 'x1': round(cx0, 2), 'z1': round(z1, 2), 'thicknessCm': round(thickness, 2), 'source': f'orange-poly-{idx}'})
        else:
            cz0 = (cmz(r.y0) + cmz(r.y1)) / 2
            thickness = abs(cmz(r.y1) - cmz(r.y0))
            if thickness <= 80:
                walls.append({'kind': 'wall', 'shape': 'segment', 'x0': round(x0, 2), 'z0': round(cz0, 2), 'x1': round(x1, 2), 'z1': round(cz0, 2), 'thicknessCm': round(thickness, 2), 'source': f'orange-poly-{idx}'})


def simple_rects_for_fill(page, color, kind, min_cm=5):
    out = []
    for idx, d in enumerate(page.get_drawings()):
        if same(d.get('fill'), color):
            for item in d.get('items', []):
                if item[0] == 're':
                    add_rect(out, item[1], kind, f'{kind}-{idx}', min_cm=min_cm)
    return out


def main():
    page = fitz.open(str(PDF))[0]
    walls = []
    columns = []
    low_walls = []
    furniture = []
    doors = []
    door_sills = []

    for idx, d in enumerate(page.get_drawings()):
        fill = d.get('fill')
        if same(fill, COLORS['orange']):
            extract_orange(d, idx, walls)
        elif same(fill, COLORS['red']):
            for item in d.get('items', []):
                if item[0] == 're': add_rect(columns, item[1], 'column', f'column-{idx}', min_cm=4)
        elif same(fill, COLORS['cyan']):
            for item in d.get('items', []):
                if item[0] == 're': add_rect(low_walls, item[1], 'low-wall', f'lowwall-{idx}', min_cm=4)
        elif same(fill, COLORS['door_arc']):
            door = extract_door_arc(d, idx)
            if door:
                doors.append(door)
        elif same(fill, COLORS['door_sill']):
            for item in d.get('items', []):
                if item[0] == 're': add_rect(door_sills, item[1], 'door-sill', f'door-sill-{idx}', min_cm=4)

    # Furniture blocks from the architect's color plan.
    for kind, color in [('cabinet', COLORS['pink']), ('desk', COLORS['wood']), ('table', COLORS['blue'])]:
        furniture.extend(simple_rects_for_fill(page, color, kind, min_cm=5))

    # Chairs are drawn from several small green shapes; turn the larger seat backs into small stools/chairs.
    green = simple_rects_for_fill(page, COLORS['green'], 'chair', min_cm=3)
    # reduce duplicate chair parts by only keeping pieces with useful area and grouping on center proximity
    chair_centers = []
    for item in green:
        w = abs(item['x1'] - item['x0']); d = abs(item['z1'] - item['z0'])
        if w < 12 or d < 6: continue
        cx = (item['x0'] + item['x1'])/2; cz = (item['z0'] + item['z1'])/2
        if any(abs(cx-x)<18 and abs(cz-z)<18 for x,z in chair_centers): continue
        chair_centers.append((cx,cz))
        furniture.append({'kind':'chair','shape':'rect','x0':round(cx-18,2),'z0':round(cz-18,2),'x1':round(cx+18,2),'z1':round(cz+18,2),'source':'green-chair'})

    # Add a few custom decorative Nordic elements for readability.
    decor = [
        {'kind':'plant','x':985,'z':705}, {'kind':'plant','x':1170,'z':705},
        {'kind':'plant','x':2260,'z':1265}, {'kind':'plant','x':2485,'z':1270},
        {'kind':'sofa','x0':980,'z0':740,'x1':1160,'z1':805},
        {'kind':'lounge-chair','x':935,'z':770,'rotation':0},
        {'kind':'lounge-chair','x':1210,'z':770,'rotation':180},
        {'kind':'coffee-table','x0':1015,'z0':815,'x1':1130,'z1':865},
        {'kind':'rug','x0':910,'z0':715,'x1':1240,'z1':895},
        {'kind':'rug','x0':2165,'z0':835,'x1':2620,'z1':1175},
    ]

    fixtures = [
        {'kind':'toilet','x':70,'z':340,'rotation':90},
        {'kind':'sink','x':175,'z':342,'rotation':180},
        {'kind':'urinal','x':72,'z':590,'rotation':90},
        {'kind':'toilet','x':72,'z':705,'rotation':90},
        {'kind':'sink','x':245,'z':675,'rotation':270},
        {'kind':'toilet','x':75,'z':910,'rotation':90},
        {'kind':'sink','x':86,'z':1020,'rotation':90},
        {'kind':'sink','x':505,'z':755,'rotation':0},
        {'kind':'sink','x':560,'z':755,'rotation':0},
    ]

    floor_areas = [
        {'kind':'site-ground','shape':'rect','x0':round(cmx(0),2),'z0':round(cmz(0),2),'x1':round(cmx(548.4400024414062),2),'z1':round(cmz(360.77801513671875),2),'heightCm':0},
        {'kind':'raised-office-floor','shape':'rect','x0':-5,'z0':-5,'x1':2705,'z1':1625,'heightCm':60},
    ]

    steps = [
        {'kind':'step','shape':'rect','x0':2108,'z0':1540,'x1':2705,'z1':1625,'heightCm':30,'label':'+30'},
        {'kind':'step','shape':'rect','x0':2320,'z0':1460,'x1':2705,'z1':1540,'heightCm':45,'label':'+45'},
        {'kind':'entry-platform','shape':'rect','x0':2145,'z0':1230,'x1':2705,'z1':1460,'heightCm':60,'label':'+60 門口'},
    ]

    # Full rendered image mapped to centimeters.
    image = {'file':'floorplan.png','pixelWidth':2743,'pixelHeight':1804,
             'x0':round(cmx(0),2),'z0':round(cmz(0),2),'x1':round(cmx(548.4400024414062),2),'z1':round(cmz(360.77801513671875),2)}

    data = {
        'source': 'B版(1).pdf',
        'units': 'cm',
        'calibration': {'cmPerPtX': CM_PER_PT_X, 'offsetX': CM_OFFSET_X, 'cmPerPtZ': CM_PER_PT_Z, 'offsetZ': CM_OFFSET_Z},
        'axes': {
            'x': [{'id':'G','x':0},{'id':'F','x':510},{'id':'E','x':1055},{'id':'D','x':1600},{'id':'C','x':2145},{'id':'B','x':2690},{'id':'A','x':3148}],
            'z': [{'id':'4','z':0},{'id':'3','z':600},{'id':'2','z':1200},{'id':'1','z':1615}],
        },
        'image': image,
        'walls': walls,
        'columns': columns,
        'lowWalls': low_walls,
        'doors': doors,
        'doorSills': door_sills,
        'furniture': furniture,
        'fixtures': fixtures,
        'floorAreas': floor_areas,
        'steps': steps,
        'decor': decor,
        'levels': {'groundCm': 0, 'officeCm': 60},
        'defaults': {'wallHeightCm': 200, 'columnHeightCm': 260, 'lowWallHeightCm': 130, 'doorHeightCm': 198},
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    ANALYSIS.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'walls': len(walls), 'columns': len(columns), 'lowWalls': len(low_walls), 'furniture': len(furniture), 'out': str(OUT)}, ensure_ascii=False))

if __name__ == '__main__':
    main()
