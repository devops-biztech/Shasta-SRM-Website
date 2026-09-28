"""Regenerate public/data/towns.json: real city limits for the towns on the 3D model.

Source: U.S. Census Bureau TIGERweb (Incorporated Places and Census Designated Places, current vintage).
Coordinates are written in the heightmap's grid space (u → east, v → south, 0–1), using the same
Web Mercator crop and resize as build_terrain.py, so the outlines sit exactly on the terrain.

Usage (standard library only):
    python3 build_towns.py
"""
import json, math, os, urllib.parse, urllib.request

# must match build_terrain.py
Z = 10
LAT0, LAT1, LON0, LON1 = 40.10, 41.58, -123.00, -121.35
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'data')

TIGER = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer'
# name, TIGERweb layer (4 = incorporated city, 5 = census designated place)
TOWNS = [('Redding', 4), ('Anderson', 4), ('Shasta Lake', 4), ('Red Bluff', 4), ('Cottonwood', 5), ('Burney', 5), ('Weaverville', 5)]
GW = 256
TOL = 0.00025  # simplification tolerance in grid units (about 35 m)


def px(lat, lon, z=Z):
    n = 256 * 2 ** z
    s = math.sin(math.radians(lat))
    return (lon + 180) / 360 * n, (0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * n


def grid():
    """Map lat/lon to the (u, v) of the terrain mesh built from heights.json."""
    x0, y0 = px(LAT1, LON0); x1, y1 = px(LAT0, LON1)
    W = int(x1) - int(x0); H = int(y1) - int(y0)
    gh = int(round(H * GW / W))
    def uv(lon, lat):
        X, Y = px(lat, lon)
        # skimage.resize maps output pixel centres onto input pixel centres; PlaneGeometry puts vertex i at i/(n-1)
        i = (X - int(x0)) * GW / W - 0.5; j = (Y - int(y0)) * gh / H - 0.5
        return i / (GW - 1), j / (gh - 1)
    return uv


def simplify(pts, tol):
    if len(pts) < 4: return pts
    (ax, ay), (bx, by) = pts[0], pts[-1]
    dx, dy = bx - ax, by - ay; L = math.hypot(dx, dy) or 1e-12
    k, dmax = 0, -1.0
    for n, (x, y) in enumerate(pts[1:-1], 1):
        d = abs(dy * (x - ax) - dx * (y - ay)) / L if L > 1e-12 else math.hypot(x - ax, y - ay)
        if d > dmax: k, dmax = n, d
    if dmax <= tol: return [pts[0], pts[-1]]
    return simplify(pts[:k + 1], tol)[:-1] + simplify(pts[k:], tol)


def ring_simplify(ring, tol):
    # split a closed ring at its farthest point so both halves have distinct end points
    far = max(range(len(ring)), key=lambda n: math.hypot(ring[n][0] - ring[0][0], ring[n][1] - ring[0][1]))
    return simplify(ring[:far + 1], tol)[:-1] + simplify(ring[far:], tol)


def fetch(name, layer):
    q = urllib.parse.urlencode({'where': f"STATE='06' AND BASENAME='{name}'", 'outFields': 'NAME,AREALAND,INTPTLAT,INTPTLON', 'outSR': 4326, 'f': 'geojson'})
    feats = json.load(urllib.request.urlopen(f'{TIGER}/{layer}/query?{q}', timeout=60))['features']
    # several California places share a name (there are two Cottonwoods); keep the one inside the model
    feats = [f for f in feats if LAT0 < float(f['properties']['INTPTLAT']) < LAT1 and LON0 < float(f['properties']['INTPTLON']) < LON1]
    assert len(feats) == 1, f'{name}: {len(feats)} matches'
    return feats[0]


def main():
    uv = grid(); out = []
    for name, layer in TOWNS:
        f = fetch(name, layer); g = f['geometry']
        polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        rings = []
        for poly in polys:
            for ring in poly:  # outer ring first, then holes (county islands); even-odd fill handles both
                r = ring_simplify([uv(lon, lat) for lon, lat in ring[:-1]], TOL)
                if len(r) >= 3: rings.append([round(c, 5) for p in r for c in p])
        p = f['properties']
        out.append({'name': name, 'kind': 'city' if layer == 4 else 'cdp', 'km2': round(p['AREALAND'] / 1e6, 1),
                    'center': [round(c, 4) for c in uv(float(p['INTPTLON']), float(p['INTPTLAT']))], 'rings': rings})
        print(f"{name:12} {p['NAME']:18} {len(rings)} rings, {sum(len(r) // 2 for r in rings)} pts")
    json.dump({'source': 'U.S. Census Bureau TIGERweb', 'towns': out}, open(os.path.join(OUT, 'towns.json'), 'w'), separators=(',', ':'))


if __name__ == '__main__':
    main()
