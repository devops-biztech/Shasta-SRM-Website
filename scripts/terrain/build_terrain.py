"""Regenerate public/data/heights.json and public/data/contours.json from open elevation data.

Source: AWS Terrain Tiles (Terrarium encoding, derived from USGS 3DEP/SRTM), zoom 10.
Region: lat 40.10–41.58, lon -123.00 to -121.35 (Mt. Shasta, Lassen Peak, Redding, Anderson, Red Bluff).

Usage:
    python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
    .venv/bin/python build_terrain.py
"""
import base64, json, math, os, urllib.request
import numpy as np
from PIL import Image
from skimage.filters import gaussian, median
from skimage.measure import approximate_polygon, find_contours
from skimage.morphology import disk
from skimage.transform import resize

Z = 10
LAT0, LAT1, LON0, LON1 = 40.10, 41.58, -123.00, -121.35
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'public', 'data')
TILES = os.path.join(HERE, 'tiles')


def px(lat, lon, z=Z):
    n = 256 * 2 ** z
    s = math.sin(math.radians(lat))
    return (lon + 180) / 360 * n, (0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * n


def mosaic():
    os.makedirs(TILES, exist_ok=True)
    x0, y0 = px(LAT1, LON0); x1, y1 = px(LAT0, LON1)
    tx0, ty0, tx1, ty1 = int(x0 // 256), int(y0 // 256), int(x1 // 256), int(y1 // 256)
    mos = np.zeros(((ty1 - ty0 + 1) * 256, (tx1 - tx0 + 1) * 256), np.float32)
    for ty in range(ty0, ty1 + 1):
        for tx in range(tx0, tx1 + 1):
            fn = os.path.join(TILES, f'{Z}_{tx}_{ty}.png')
            if not os.path.exists(fn):
                urllib.request.urlretrieve(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{tx}/{ty}.png', fn)
            a = np.asarray(Image.open(fn).convert('RGB')).astype(np.float32)
            mos[(ty - ty0) * 256:(ty - ty0 + 1) * 256, (tx - tx0) * 256:(tx - tx0 + 1) * 256] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
    dem = np.clip(mos[int(y0 - ty0 * 256):int(y1 - ty0 * 256), int(x0 - tx0 * 256):int(x1 - tx0 * 256)], 0, None)
    m = median(dem, disk(2))                      # remove single-pixel spikes in the source tiles
    return np.where(np.abs(dem - m) > 300, m, dem)


def main():
    d = mosaic(); H, W = d.shape
    # contours every 100 m on a 760-px-wide grid, in a 1000-unit-wide coordinate space
    w2 = 760; h2 = int(round(H * w2 / W))
    s = gaussian(resize(d, (h2, w2), anti_aliasing=True, preserve_range=True), 1.7, preserve_range=True)
    sc = 1000 / (w2 - 1); levels = []
    for lvl in range(200, 4300, 100):
        lines = []
        for c in find_contours(s, lvl):
            if len(c) < 8: continue
            c = approximate_polygon(c, tolerance=0.6)
            if len(c) < 4: continue
            lines.append([v for y, x in c for v in (round(x * sc, 1), round(y * sc, 1))])
        levels.append({'e': lvl, 'l': lines})
    json.dump({'w': 1000, 'h': round((h2 - 1) * sc, 1), 'levels': levels}, open(os.path.join(OUT, 'contours.json'), 'w'), separators=(',', ':'))
    # 256-wide heightmap (metres, uint16 little-endian, base64) for the 3D model
    gw = 256; gh = int(round(H * gw / W))
    hm = gaussian(resize(d, (gh, gw), anti_aliasing=True, preserve_range=True), 0.7, preserve_range=True)
    raw = np.clip(hm, 0, 65535).astype('<u2').tobytes()
    json.dump({'gw': gw, 'gh': gh, 'le16': base64.b64encode(raw).decode()}, open(os.path.join(OUT, 'heights.json'), 'w'))
    print(f'contours.json and heights.json written ({gw}x{gh} grid, max {d.max():.0f} m)')


if __name__ == '__main__':
    main()
