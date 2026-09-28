// Real-terrain contour map of the North State, drawn as a tilted relief with live flows.
import type { SunState } from '../../lib/sun';
import { type EngineContext, type StoryEngine, PLACES, loadHeights, clamp, lerp, ease, seeded, hits } from './types';

type Line = { p: Path2D; closed: boolean; b: [number, number, number, number] };

const INSET = `
<div class="inset" data-inset aria-hidden="true">
  <div class="inset-cap"><span>Inside the plant · Anderson, CA</span><span>Illustrative cutaway</span></div>
  <svg viewBox="0 0 560 270" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path class="draw" pathLength="1" d="M10 236 H550" stroke-width="1"/>
    <path class="draw" pathLength="1" d="M22 236 Q58 176 104 236"/>
    <path class="draw" pathLength="1" d="M88 222 L168 120 M100 230 L178 130"/>
    <g class="hot h-boiler">
      <rect class="draw" pathLength="1" x="168" y="74" width="96" height="162" rx="3"/>
      <path class="draw" pathLength="1" d="M184 92 V200 M198 92 V200 M212 92 V200 M226 92 V200 M240 92 V200 M254 92 V200" stroke-width="1"/>
      <path d="M216 226 C228 212 232 202 226 190 C236 196 244 208 238 222 C246 216 246 206 244 200 C254 210 254 226 240 232 H196 C186 226 188 212 198 204 C198 214 204 220 216 226 Z" fill="var(--boil)" stroke="none"/>
      <text class="t" x="150" y="96" text-anchor="end" stroke="none">Boiler</text>
    </g>
    <path class="draw" pathLength="1" id="c-steam" d="M216 74 V44 H370 V112" stroke="var(--steam)" stroke-width="3"/>
    <text x="293" y="34" text-anchor="middle" stroke="none">High-pressure steam</text>
    <g class="hot h-turbine">
      <path class="draw" pathLength="1" d="M346 112 L430 126 V186 L346 200 Z"/>
      <path class="draw" pathLength="1" d="M362 126 V186 M378 124 V188 M394 126 V186 M410 128 V184" stroke-width="1"/>
      <rect class="draw" pathLength="1" x="440" y="128" width="62" height="56" rx="4"/>
      <path class="draw" pathLength="1" d="M452 140 Q471 156 490 140 M452 156 Q471 172 490 156 M452 172 Q471 188 490 172" stroke-width="1"/>
      <text class="t" x="388" y="222" text-anchor="middle" stroke="none">Turbine</text>
      <text class="t" x="471" y="206" text-anchor="middle" stroke="none">Generator</text>
      <text x="471" y="222" text-anchor="middle" stroke="none">55 MW</text>
    </g>
    <path class="draw" pathLength="1" d="M388 200 V236" stroke-width="1"/>
    <path class="draw" pathLength="1" id="c-power" d="M502 156 H532 V96 H552" stroke="var(--gold)" stroke-width="3"/>
    <path class="draw" pathLength="1" d="M524 236 L536 96 L548 236 M528 190 H544 M530 150 H542" stroke-width="1"/>
    <text x="536" y="84" text-anchor="middle" stroke="none">To grid</text>
    <path id="c-fuel" d="M62 206 L96 222 L172 128 L200 180" stroke="none"/>
    <g stroke="none">
      <rect width="7" height="5" fill="var(--fuel)"><animateMotion dur="3s" repeatCount="indefinite" rotate="auto"><mpath href="#c-fuel"/></animateMotion></rect>
      <rect width="7" height="5" fill="var(--fuel)"><animateMotion dur="3s" begin="1s" repeatCount="indefinite" rotate="auto"><mpath href="#c-fuel"/></animateMotion></rect>
      <rect width="7" height="5" fill="#a9865c"><animateMotion dur="3s" begin="2s" repeatCount="indefinite" rotate="auto"><mpath href="#c-fuel"/></animateMotion></rect>
      <circle r="5" fill="var(--steam)" opacity=".7"><animateMotion dur="2.2s" repeatCount="indefinite"><mpath href="#c-steam"/></animateMotion></circle>
      <circle r="5" fill="var(--steam)" opacity=".7"><animateMotion dur="2.2s" begin="1.1s" repeatCount="indefinite"><mpath href="#c-steam"/></animateMotion></circle>
      <circle r="4" fill="var(--gold)"><animateMotion dur="1s" repeatCount="indefinite"><mpath href="#c-power"/></animateMotion></circle>
      <circle r="4" fill="var(--gold)"><animateMotion dur="1s" begin=".5s" repeatCount="indefinite"><mpath href="#c-power"/></animateMotion></circle>
    </g>
  </svg>
</div>`;

export async function createContour(ctx: EngineContext): Promise<StoryEngine> {
  const { canvas: mapC, labels, mobile, reduce, avoid } = ctx;
  let keepOut: DOMRect[] = [];
  const rnd = seeded(3);
  const [C, heights] = await Promise.all([
    fetch('/data/contours.json').then((r) => { if (!r.ok) throw new Error(`contour data ${r.status}`); return r.json(); }),
    loadHeights(),
  ]);
  const { hm: HM, gw: GW, gh: GH } = heights;
  const MW = 1000, MH: number = C.h;
  const elev = (x: number, y: number) => {
    const gx = clamp((x / MW) * (GW - 1), 0, GW - 1.001), gy = clamp((y / MH) * (GH - 1), 0, GH - 1.001);
    const i = Math.floor(gx), j = Math.floor(gy), u = gx - i, v = gy - j;
    return lerp(lerp(HM[j * GW + i], HM[j * GW + i + 1], u), lerp(HM[(j + 1) * GW + i], HM[(j + 1) * GW + i + 1], u), v);
  };
  const PL: Record<string, [number, number]> = {};
  for (const [k, [u, v]] of Object.entries(PLACES)) PL[k] = [u * MW, v * MH];
  const PLANT = PL.Anderson;

  const levels = (C.levels as { e: number; l: number[][] }[]).map((L) => ({
    e: L.e, idx: L.e % 500 === 0,
    lines: L.l.map((f): Line => {
      const n = f.length, closed = Math.abs(f[0] - f[n - 2]) < 0.01 && Math.abs(f[1] - f[n - 1]) < 0.01;
      const p = new Path2D(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (let i = 0; i < n; i += 2) { x0 = Math.min(x0, f[i]); x1 = Math.max(x1, f[i]); y0 = Math.min(y0, f[i + 1]); y1 = Math.max(y1, f[i + 1]); }
      if (closed) {
        p.moveTo((f[0] + f[2]) / 2, (f[1] + f[3]) / 2);
        for (let i = 2; i < n; i += 2) { const j = (i + 2) % (n - 2); p.quadraticCurveTo(f[i], f[i + 1], (f[i] + f[j]) / 2, (f[i + 1] + f[j + 1]) / 2); }
        p.closePath();
      } else {
        p.moveTo(f[0], f[1]);
        for (let i = 2; i < n - 2; i += 2) p.quadraticCurveTo(f[i], f[i + 1], (f[i] + f[i + 2]) / 2, (f[i + 1] + f[i + 3]) / 2);
        p.lineTo(f[n - 2], f[n - 1]);
      }
      return { p, closed, b: [x0, y0, x1, y1] };
    }),
  }));

  // second canvas for flows and labels, stacked above the map
  const fxC = document.createElement('canvas');
  fxC.className = mapC.className; fxC.setAttribute('aria-hidden', 'true');
  mapC.after(fxC);
  labels.insertAdjacentHTML('beforeend', INSET);
  const inset = labels.querySelector<HTMLElement>('[data-inset]')!;
  const mctx = mapC.getContext('2d')!, fctx = fxC.getContext('2d')!;

  let night = false, dirty = true, W = 1, H = 1, dpr = 1, fit = 1, step = -1;
  const RAMP_D: [number, number[]][] = [[0, [238, 241, 232]], [400, [228, 236, 224]], [1200, [211, 226, 212]], [2000, [196, 216, 200]], [2600, [214, 219, 214]], [3100, [244, 246, 246]], [4400, [255, 255, 255]]];
  const RAMP_N: [number, number[]][] = [[0, [11, 21, 35]], [1500, [18, 33, 54]], [3000, [30, 48, 74]], [4400, [52, 72, 102]]];
  const tint = (e: number) => {
    const R = night ? RAMP_N : RAMP_D; let i = 0; while (i < R.length - 2 && R[i + 1][0] <= e) i++;
    const t = clamp((e - R[i][0]) / (R[i + 1][0] - R[i][0]), 0, 1), a = R[i][1], b = R[i + 1][1];
    return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * t)).join(',')})`;
  };

  type Key = [number, number, number, number]; // x, y, zoom, tilt
  const HERO: Key = [600, 610, 1.0, 0.5], FINAL: Key = [520, 770, 1.3, 0.5];
  const cam = { x: HERO[0], y: HERO[1], z: HERO[2], t: HERO[3] };
  let curSf = -1;
  const EXAG = 3.6 / 139;
  const center = (): [number, number] => (mobile ? [W * 0.5, H * (step >= 0 ? 0.36 : 0.76)] : [W * (step >= 0 ? 0.64 : 0.68), H * 0.56]);
  const proj = (x: number, y: number, e: number): [number, number] => {
    const [cx, cy] = center(), z = cam.z * fit;
    return [cx + (x - cam.x) * z, cy + ((y - cam.y) * cam.t - e * EXAG) * z];
  };

  function drawMap() {
    const [cx, cy] = center(), z = cam.z * fit;
    mctx.setTransform(1, 0, 0, 1, 0, 0);
    mctx.fillStyle = night ? '#0a1422' : '#eef1e8'; mctx.fillRect(0, 0, mapC.width, mapC.height);
    const vx0 = cam.x - cx / z - 20, vx1 = cam.x + (W - cx) / z + 20;
    for (const L of levels) {
      const off = L.e * EXAG;
      const vy0 = cam.y - cy / (z * cam.t) + off / cam.t - 20, vy1 = cam.y + (H - cy) / (z * cam.t) + off / cam.t + 20;
      mctx.setTransform(z * dpr, 0, 0, z * cam.t * dpr, (cx - cam.x * z) * dpr, (cy - cam.y * z * cam.t - off * z) * dpr);
      mctx.fillStyle = tint(L.e);
      mctx.lineWidth = (L.idx ? 1.35 : 0.75) / z;
      mctx.strokeStyle = night ? (L.idx ? 'rgba(160,195,230,.5)' : 'rgba(160,195,230,.22)') : (L.idx ? 'rgba(18,48,32,.62)' : 'rgba(18,48,32,.3)');
      for (const ln of L.lines) {
        const b = ln.b; if (b[2] < vx0 || b[0] > vx1 || b[3] < vy0 || b[1] > vy1) continue;
        if (ln.closed) mctx.fill(ln.p);
        mctx.stroke(ln.p);
      }
    }
    dirty = false;
  }

  // illustrative fuel sources and routes on the real terrain
  const stands: { x: number; y: number; e: number; ph: number }[] = [];
  const zones = [[120, 200, 470, 700], [620, 700, 960, 1120]];
  for (let g = 0; stands.length < 300 && g < 20000; g++) {
    const z = zones[stands.length % 2], x = lerp(z[0], z[2], rnd()), y = lerp(z[1], z[3], rnd()), e = elev(x, y);
    if (e > 650 && e < 2100) stands.push({ x, y, e, ph: rnd() * 6.28 });
  }
  type Bez = { a: [number, number]; c: [number, number]; b: [number, number] };
  const bez = (r: Bez, t: number): [number, number] => [
    (1 - t) ** 2 * r.a[0] + 2 * (1 - t) * t * r.c[0] + t * t * r.b[0],
    (1 - t) ** 2 * r.a[1] + 2 * (1 - t) * t * r.c[1] + t * t * r.b[1],
  ];
  const hauls: Bez[] = stands.filter((_, i) => i % 18 === 0).map((s) => ({ a: [s.x, s.y], c: [lerp(s.x, 420, 0.75), lerp(s.y, 800, 0.55)], b: PLANT }));
  const towns = ['Redding', 'Cottonwood', 'Red Bluff', 'Shasta Lake', 'Burney', 'Weaverville'].map((k) => ({ k, p: PL[k] }));
  const grids: Bez[] = towns.map((t) => ({ a: PLANT, c: [lerp(PLANT[0], t.p[0], 0.5) + (t.p[1] - PLANT[1]) * 0.12, lerp(PLANT[1], t.p[1], 0.5) - 20] as [number, number], b: t.p }));
  grids.push({ a: PLANT, c: [470, 1060], b: [520, MH] });
  let heroIdx = 0, best = Infinity;
  hauls.forEach((h, i) => { const d = Math.hypot(h.a[0] - 290, h.a[1] - 470) + (h.a[0] > PLANT[0] ? 1e4 : 0); if (d < best) { best = d; heroIdx = i; } });
  const heroHaul = hauls[heroIdx], heroGrid = grids[0]; // grids[0] runs to Redding
  const haulT = (sf: number) => clamp((sf - 1.8) / 1.1, 0, 1);  // truck leaves late in Chipping, reaches the yard as The haul ends
  const gridT = (sf: number) => clamp((sf - 5.8) / 1.7, 0, 1);  // pulse leaves the plant as The grid begins, reaches Redding mid-Your home
  const blend = (a: Key, b: Key, m: number): Key => [lerp(a[0], b[0], m), lerp(a[1], b[1], m), Math.exp(lerp(Math.log(a[2]), Math.log(b[2]), m)), lerp(a[3], b[3], m)];
  const follow = (r: Bez, t: number, zoom: number): Key => { const [x, y] = bez(r, t); return [x, y, zoom, 0.55]; };
  function shot(i: number, sf: number): Key {
    switch (i) {
      case -1: return HERO;
      case 0: return [heroHaul.a[0], heroHaul.a[1], lerp(2.1, 2.5, clamp(sf, 0, 1)), 0.52];
      case 1: return [heroHaul.a[0], heroHaul.a[1], 3.3, 0.55];
      case 2: return follow(heroHaul, ease(haulT(sf)), 3.2);
      case 3: return [PLANT[0], PLANT[1], 3.4, 0.58];
      case 4: case 5: return [PLANT[0], PLANT[1] + 40, 3.8, 0.62];
      case 6: return follow(heroGrid, gridT(sf), 3.3);
      default: return blend(follow(heroGrid, gridT(sf), 3.3), FINAL, ease(clamp((sf - 7.5) / 0.42, 0, 1)));
    }
  }
  const HANDOFF: Record<number, number> = { [-1]: 0.45, 0: 0.6, 1: 0.72, 2: 0.86, 3: 0.55, 4: 0.55, 5: 0.6, 6: 1, 7: 1 };
  const focus = { haul: 0, grid: 0 };
  const parts: { kind: 'h' | 'g'; r: Bez; t: number; v: number; o: number }[] = [];
  if (reduce) for (let i = 0; i < 120; i++) parts.push(i % 2 ? { kind: 'g', r: grids[i % grids.length], t: rnd(), v: 0, o: 0 } : { kind: 'h', r: hauls[i % hauls.length], t: rnd(), v: 0, o: 0 });
  const I = { stand: 0.3, haul: 0.55, grid: 0.7, towns: 0.3 };
  const targets = (s: number) =>
    s < 0 ? { stand: 0.3, haul: 0.55, grid: 0.7, towns: 0.3 }
    : s <= 1 ? { stand: 1, haul: s === 1 ? 0.25 : 0, grid: 0, towns: 0 }
    : s <= 3 ? { stand: 0.35, haul: 1, grid: 0, towns: 0 }
    : s <= 5 ? { stand: 0.1, haul: 0.35, grid: 0.2, towns: 0 }
    : { stand: 0.15, haul: 0.25, grid: 1, towns: s === 7 ? 1 : 0.4 };

  const label = (text: string, x: number, y: number, o: { a: number; font: string; color: string; dx?: number; dy?: number; dot?: number; sub?: string; subColor?: string; align?: CanvasTextAlign }) => {
    const [sx, sy] = proj(x, y, elev(x, y));
    if (sx < -100 || sx > W + 100 || sy < -40 || sy > H + 40 || o.a <= 0) return;
    fctx.globalAlpha = o.a; fctx.font = o.font; fctx.fillStyle = o.color;
    let align = o.align ?? 'left', dx = o.dx ?? 0;
    const tw = fctx.measureText(text).width;
    if (align === 'left' && sx + dx + tw > W - 16) { align = 'right'; dx = -dx; }
    const bx = align === 'left' ? sx + dx : align === 'right' ? sx + dx - tw : sx - tw / 2;
    if (hits(keepOut, bx - 6, sy - 16, tw + 12, o.sub ? 38 : 22)) { fctx.globalAlpha = 1; return; }
    fctx.textAlign = align;
    if (o.dot) { fctx.beginPath(); fctx.arc(sx, sy, o.dot, 0, 7); fctx.fill(); }
    fctx.fillText(text, sx + dx, sy + (o.dy ?? 0));
    if (o.sub) { fctx.font = '600 12.5px "Schibsted Grotesk Variable", sans-serif'; fctx.fillStyle = o.subColor ?? o.color; fctx.fillText(o.sub, sx + dx, sy + (o.dy ?? 0) + 16); }
    fctx.globalAlpha = 1;
  };

  let clock = 0, lastSig = '';
  function drawFx(dt: number) {
    clock += dt; keepOut = avoid();
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0); fctx.clearRect(0, 0, W, H);
    const FUEL = night ? '#7fd192' : '#2f7a45', GOLD = night ? '#ffc94d' : '#b27a0c', INK = night ? '#eaf1f7' : '#13241c', MUT = night ? '#a3b3c5' : '#4a5b53';
    const zf = clamp(cam.z / 2, 0.8, 2.2);
    if (I.stand > 0.01) {
      fctx.fillStyle = FUEL;
      for (const s of stands) {
        const [sx, sy] = proj(s.x, s.y, s.e);
        fctx.globalAlpha = I.stand * (0.35 + 0.65 * Math.sin(clock * 1.2 + s.ph) ** 2);
        fctx.beginPath(); fctx.arc(sx, sy, 1.3 * zf, 0, 7); fctx.fill();
      }
      fctx.globalAlpha = 1;
    }
    const route = (r: Bez) => { fctx.beginPath(); for (let t = 0; t <= 1.001; t += 0.05) { const [x, y] = bez(r, t); const [sx, sy] = proj(x, y, elev(x, y)); t ? fctx.lineTo(sx, sy) : fctx.moveTo(sx, sy); } fctx.stroke(); };
    if (I.haul > 0.01) {
      fctx.strokeStyle = FUEL; fctx.lineWidth = 1; fctx.globalAlpha = 0.18 * I.haul * (1 - 0.5 * focus.haul); fctx.setLineDash([2, 5]);
      hauls.forEach((h) => h !== heroHaul && route(h)); fctx.setLineDash([]);
    }
    fctx.strokeStyle = FUEL; fctx.lineWidth = 1.5 + 1.5 * focus.haul; fctx.globalAlpha = 0.2 + 0.7 * focus.haul; route(heroHaul);
    if (I.grid > 0.01) { fctx.strokeStyle = GOLD; fctx.lineWidth = 1.2; fctx.globalAlpha = 0.35 * I.grid * (1 - 0.55 * focus.grid); grids.forEach((g) => g !== heroGrid && route(g)); }
    fctx.strokeStyle = GOLD; fctx.lineWidth = 1.2 + 1.6 * focus.grid; fctx.globalAlpha = Math.max(0.35 * I.grid, 0.9 * focus.grid); route(heroGrid);
    fctx.globalAlpha = 1;
    for (const p of parts) {
      const [x, y] = bez(p.r, p.t), [sx, sy] = proj(x, y, elev(x, y));
      if (p.kind === 'h') {
        fctx.globalAlpha = Math.min(1, I.haul * 1.4) * (p.t > 0.92 ? (1 - p.t) / 0.08 : 1) * (p.r === heroHaul ? 1 : 1 - 0.6 * focus.haul);
        fctx.fillStyle = FUEL; const r = 1.9 * zf;
        fctx.save(); fctx.translate(sx, sy + p.o); fctx.rotate(p.t * 9); fctx.fillRect(-r, -r * 0.7, r * 2, r * 1.4); fctx.restore();
      } else {
        const a = Math.min(1, I.grid * 1.3) * (p.r === heroGrid ? 1 : 1 - 0.55 * focus.grid);
        if (night) fctx.globalCompositeOperation = 'lighter';
        fctx.fillStyle = GOLD;
        fctx.globalAlpha = a * 0.18; fctx.beginPath(); fctx.arc(sx, sy + p.o, 4.5 * zf, 0, 7); fctx.fill();
        fctx.globalAlpha = a; fctx.beginPath(); fctx.arc(sx, sy + p.o, 1.7 * zf, 0, 7); fctx.fill();
        fctx.globalCompositeOperation = 'source-over';
      }
    }
    fctx.globalAlpha = 1;
    // the chip truck we follow
    {
      const t = ease(haulT(curSf));
      const [x, y] = bez(heroHaul, t), [x2, y2] = bez(heroHaul, Math.min(1, t + 0.01)), [x0, y0] = bez(heroHaul, Math.max(0, t - 0.01));
      const [sx, sy] = proj(x, y, elev(x, y)), [ax, ay] = proj(x2, y2, elev(x2, y2)), [bx, by] = proj(x0, y0, elev(x0, y0));
      const s2 = clamp(cam.z / 3, 0.7, 1.6);
      fctx.save(); fctx.translate(sx, sy); fctx.rotate(Math.atan2(ay - by, ax - bx)); fctx.scale(s2, s2);
      fctx.lineWidth = 1.2; fctx.strokeStyle = night ? '#0a1422' : '#13241c';
      fctx.fillStyle = '#5f6b64'; fctx.beginPath(); fctx.roundRect(-13, -4.5, 17, 9, 2); fctx.fill(); fctx.stroke();
      fctx.fillStyle = '#8b6b49'; fctx.beginPath(); fctx.roundRect(-12, -3, 15, 6, 1.5); fctx.fill();
      fctx.fillStyle = '#eceae4'; fctx.beginPath(); fctx.roundRect(5, -4.5, 7, 9, 2); fctx.fill(); fctx.stroke();
      fctx.restore();
    }
    // the pulse of electricity we follow
    const e = gridT(curSf);
    if (step >= 5 && e > 0 && e < 1) {
      if (night) fctx.globalCompositeOperation = 'lighter';
      fctx.fillStyle = night ? '#ffd46e' : '#e0a92e';
      for (let n = 0; n < 7; n++) {
        const t = e - n * 0.012; if (t <= 0) break;
        const [x, y] = bez(heroGrid, t), [sx, sy] = proj(x, y, elev(x, y)), r = (5.5 - n * 0.6) * zf;
        fctx.globalAlpha = (1 - n * 0.13) * 0.25; fctx.beginPath(); fctx.arc(sx, sy, r * 2.2, 0, 7); fctx.fill();
        fctx.globalAlpha = 1 - n * 0.13; fctx.beginPath(); fctx.arc(sx, sy, r * 0.55, 0, 7); fctx.fill();
      }
      fctx.globalCompositeOperation = 'source-over'; fctx.globalAlpha = 1;
    }
    // Redding lights as the pulse arrives; the rest of the North State as we pull out
    const arrive = step >= 6 ? clamp((e - 0.93) / 0.07, 0, 1) : 0, spread = clamp((curSf - 7.5) / 0.4, 0, 1);
    for (const t of towns) {
      const d = clamp(Math.hypot(t.p[0] - PLANT[0], t.p[1] - PLANT[1]) / 450, 0, 1);
      const lit = t.k === 'Redding' ? arrive : clamp(spread * 1.5 - d * 0.5, 0, 1);
      if (lit <= 0.01) continue;
      const [sx, sy] = proj(t.p[0], t.p[1], elev(...t.p));
      if (night) fctx.globalCompositeOperation = 'lighter';
      const g = fctx.createRadialGradient(sx, sy, 0, sx, sy, 16 * zf);
      g.addColorStop(0, night ? 'rgba(255,201,77,.9)' : 'rgba(224,169,46,.55)'); g.addColorStop(1, 'rgba(255,201,77,0)');
      fctx.globalAlpha = lit; fctx.fillStyle = g; fctx.beginPath(); fctx.arc(sx, sy, 16 * zf, 0, 7); fctx.fill();
      fctx.globalCompositeOperation = 'source-over';
    }
    fctx.globalAlpha = 1;
    for (const t of towns) {
      if (I.towns <= 0.01 || curSf < 7.5) break;
      const [sx, sy] = proj(t.p[0], t.p[1], elev(...t.p)), pulse = (clock * 0.6 + t.p[0] / 300) % 1;
      fctx.strokeStyle = GOLD; fctx.lineWidth = 1.5; fctx.globalAlpha = I.towns * (1 - pulse) * 0.8;
      fctx.beginPath(); fctx.arc(sx, sy, 4 + pulse * 22 * zf, 0, 7); fctx.stroke();
    }
    fctx.globalAlpha = 1;
    {
      const [sx, sy] = proj(PLANT[0], PLANT[1], elev(...PLANT)), pulse = (clock * 0.8) % 1;
      fctx.strokeStyle = GOLD; fctx.lineWidth = 2; fctx.globalAlpha = 1 - pulse;
      fctx.beginPath(); fctx.arc(sx, sy, 6 + pulse * 26, 0, 7); fctx.stroke(); fctx.globalAlpha = 1;
      fctx.fillStyle = GOLD; fctx.beginPath(); fctx.arc(sx, sy, 6, 0, 7); fctx.fill();
      fctx.fillStyle = night ? '#0a1422' : '#fff'; fctx.beginPath(); fctx.arc(sx, sy, 2.4, 0, 7); fctx.fill();
    }
    const font = (w: number, s: number) => `${w} ${s}px "Schibsted Grotesk Variable", sans-serif`;
    label('Mt. Shasta', ...PL['Mt. Shasta'], { a: 0.95, font: font(700, 15), color: INK, dx: 12, dy: -6, sub: '14,179 ft', subColor: MUT, dot: 2.5 });
    label('Lassen Peak', ...PL['Lassen Peak'], { a: 0.9, font: font(700, 15), color: INK, dx: 12, dy: -6, sub: '10,457 ft', subColor: MUT, dot: 2.5 });
    label('SRM · Anderson', PLANT[0], PLANT[1], { a: 1, font: font(700, 15), color: INK, dx: 14, dy: 5 });
    for (const k of ['Redding', 'Red Bluff', 'Shasta Lake', 'Burney', 'Weaverville', 'Cottonwood']) {
      if (k === 'Cottonwood' && cam.z < 3) continue;
      label(k, ...PL[k], { a: 0.85, font: font(600, 12.5), color: MUT, dx: 8, dy: 4, dot: 2 });
    }
    const forestA = step < 0 ? 0 : step <= 1 ? 0.85 : 0.45;
    (fctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '2.5px';
    label('SHASTA-TRINITY NATIONAL FOREST', 250, 520, { a: forestA, font: font(700, 11), color: FUEL, align: 'center' });
    label('LASSEN NATIONAL FOREST', 790, 960, { a: forestA, font: font(700, 11), color: FUEL, align: 'center' });
    (fctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
  }

  return {
    resize(w, h) {
      W = w; H = h; dpr = Math.min(2, devicePixelRatio || 1);
      for (const c of [mapC, fxC]) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      fit = Math.min(w / MW, h / (MH * 0.5 + 120)) * (mobile ? 2.1 : 1.0);
      dirty = true;
    },
    setLight(s: SunState) { night = s.night; dirty = true; },
    frame(dt, sf, s) {
      if (s !== step) { step = s; dirty = true; inset.classList.toggle('show', s === 4 || s === 5); inset.dataset.focus = s === 4 ? 'boiler' : s === 5 ? 'turbine' : ''; }
      curSf = sf;
      const i = Math.floor(sf), u = sf - i, g = HANDOFF[i] ?? 0.6;
      const here = shot(i, sf), aim = g >= 1 || i >= 7 ? here : blend(here, shot(i + 1, i + 1), ease(clamp((u - g) / (1 - g), 0, 1)));
      const k = reduce ? 1 : Math.min(1, dt * 5);
      cam.x = lerp(cam.x, aim[0], k); cam.y = lerp(cam.y, aim[1], k);
      cam.z = Math.exp(lerp(Math.log(cam.z), Math.log(aim[2]), k)); cam.t = lerp(cam.t, aim[3], k);
      const fk = reduce ? 1 : Math.min(1, dt * 3);
      focus.haul = lerp(focus.haul, s >= 0 && s <= 3 ? 1 : 0, fk);
      focus.grid = lerp(focus.grid, s >= 6 && sf < 7.55 ? 1 : 0, fk);
      const sig = `${cam.x.toFixed(2)},${cam.y.toFixed(2)},${cam.z.toFixed(4)},${cam.t.toFixed(4)}`;
      if (sig !== lastSig) { dirty = true; lastSig = sig; }
      if (dirty) drawMap();
      const T = targets(s);
      for (const key of Object.keys(I) as (keyof typeof I)[]) I[key] = lerp(I[key], T[key], reduce ? 1 : Math.min(1, dt * 2.5));
      if (!reduce) {
        if (rnd() < (mobile ? 10 : 22) * I.haul * dt) parts.push({ kind: 'h', r: hauls[Math.floor(rnd() * hauls.length)], t: 0, v: 0.09 + rnd() * 0.05, o: (rnd() - 0.5) * 6 });
        if (rnd() < (mobile ? 16 : 34) * I.grid * dt) parts.push({ kind: 'g', r: grids[Math.floor(rnd() * grids.length)], t: 0, v: 0.28 + rnd() * 0.12, o: (rnd() - 0.5) * 3 });
        if (rnd() < 8 * focus.haul * dt) parts.push({ kind: 'h', r: heroHaul, t: 0, v: 0.1 + rnd() * 0.04, o: 0 });
        if (rnd() < 12 * focus.grid * dt) parts.push({ kind: 'g', r: heroGrid, t: 0, v: 0.3 + rnd() * 0.1, o: 0 });
        for (const q of parts) q.t += q.v * dt;
        for (let i = parts.length - 1; i >= 0; i--) if (parts[i].t >= 1) parts.splice(i, 1);
        if (parts.length > 700) parts.splice(0, parts.length - 700);
      }
      drawFx(reduce ? 0 : dt);
    },
    dispose() { fxC.remove(); labels.replaceChildren(); },
  };
}
