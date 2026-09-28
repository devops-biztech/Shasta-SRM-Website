// 3D tabletop diorama of the North State, built from real elevation data and lit by the real sun.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries as mergeRaw } from 'three/addons/utils/BufferGeometryUtils.js';
import type { SunState } from '../../lib/sun';
import { PAD, buildPlant, makeTruck } from './plant';
import { type EngineContext, type StoryEngine, PLACES, loadHeights, loadTowns, inRings, clamp, lerp, ease, seeded, hits } from './types';

const RAD = Math.PI / 180;
const C = (hex: string) => new THREE.Color(hex);
const merge = (list: THREE.BufferGeometry[]) =>
  mergeRaw(list.map((g) => (g.index ? g.toNonIndexed() : g)).map((g) => {
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    return g;
  }))!;

export async function createDiorama(ctx: EngineContext): Promise<StoryEngine> {
  const { canvas, labels, mobile, reduce, avoid } = ctx;
  const rnd = seeded(5);
  const [{ hm: HM, gw: GW, gh: GH }, towns] = await Promise.all([loadHeights(), loadTowns()]);
  // towns keep their real shape but are drawn at 2/3 size, so they read as places without swamping the map
  const TOWN_SCALE = 2 / 3;
  const TOWNS = towns.map((t) => {
    const [au, av] = PLACES[t.name];
    const rings = t.rings.map((r) => r.map((c, i) => (i % 2 ? av + (c - av) * TOWN_SCALE : au + (c - au) * TOWN_SCALE)));
    const box = [1, 1, 0, 0];
    for (const r of rings) for (let i = 0; i < r.length; i += 2) {
      box[0] = Math.min(box[0], r[i]); box[1] = Math.min(box[1], r[i + 1]); box[2] = Math.max(box[2], r[i]); box[3] = Math.max(box[3], r[i + 1]);
    }
    return { ...t, rings, box };
  });
  const townAt = (u: number, v: number) =>
    TOWNS.find((t) => u >= t.box[0] && u <= t.box[2] && v >= t.box[1] && v <= t.box[3] && inRings(t.rings, u, v));

  const SX = 14, SZ = (SX * (GH - 1)) / (GW - 1), YS = (2.6 * SX) / 139000, BASE = -0.42;
  const hAt = (u: number, v: number) => {
    const gx = clamp(u * (GW - 1), 0, GW - 1.001), gy = clamp(v * (GH - 1), 0, GH - 1.001);
    const i = Math.floor(gx), j = Math.floor(gy), a = gx - i, b = gy - j;
    return lerp(lerp(HM[j * GW + i], HM[j * GW + i + 1], a), lerp(HM[(j + 1) * GW + i], HM[(j + 1) * GW + i + 1], a), b);
  };
  const W3 = (u: number, v: number, lift = 0) => new THREE.Vector3((u - 0.5) * SX, hAt(u, v) * YS + lift, (v - 0.5) * SZ);
  const slopeAt = (u: number, v: number) => {
    const d = 1 / GW;
    return Math.hypot(hAt(u + d, v) - hAt(u - d, v), hAt(u, v + d) - hAt(u, v - d)) / ((2 * 139000) / GW);
  };

  // the plant site, northeast of Anderson (the footprint is exaggerated, so it sits clear of town); level the ground under it
  const PLANT_UV: [number, number] = [PLACES.Anderson[0] + 0.04, PLACES.Anderson[1] - 0.004];
  {
    const hu = PAD.w / 2 / SX, hv = PAD.d / 2 / SZ, cu = 1 / (GW - 1), cv = 1 / (GH - 1), fall = 3 * cu;
    const out = (i: number, j: number) => Math.max(Math.abs(i * cu - PLANT_UV[0]) - hu, Math.abs(j * cv - PLANT_UV[1]) - hv); // ≤ 0 on the pad
    let sum = 0, n = 0;
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) if (out(i, j) <= 0) { sum += HM[j * GW + i]; n++; }
    const level = n ? sum / n : hAt(...PLANT_UV);
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const d = out(i, j); if (d > fall) continue;
      HM[j * GW + i] = Math.round(lerp(HM[j * GW + i], level, d <= 0 ? 1 : 1 - THREE.MathUtils.smoothstep(d / fall, 0, 1)));
    }
  }

  /* ---------- renderer ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 200);
  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);

  /* ---------- terrain ---------- */
  const PAL = { grass: C('#cdb987'), oak: C('#9fa06a'), forest: C('#56704d'), scrub: C('#7f8570'), rock: C('#a09c92'), snow: C('#f5f7f9'), lake: C('#5b8db0') };
  const isLake = (u: number, v: number, e: number, s: number) => e > 300 && e < 345 && s < 0.02 && u > 0.3 && u < 0.5 && v > 0.43 && v < 0.62;
  const tGeo = track(new THREE.PlaneGeometry(SX, SZ, GW - 1, GH - 1));
  tGeo.rotateX(-Math.PI / 2);
  const pos = tGeo.attributes.position as THREE.BufferAttribute;
  const cols = new Float32Array(pos.count * 3), tmp = new THREE.Color();
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const k = j * GW + i, u = i / (GW - 1), v = j / (GH - 1), e = HM[k];
    pos.setY(k, e * YS);
    const s = slopeAt(u, v), n = (Math.sin(u * 83) * Math.cos(v * 71) + Math.sin(u * 211 + v * 157)) * 0.5;
    if (isLake(u, v, e, s)) tmp.copy(PAL.lake);
    else if (e < 260) tmp.copy(PAL.grass).lerp(PAL.oak, clamp((e - 150) / 110, 0, 1) * 0.5);
    else if (e < 700) tmp.copy(PAL.oak).lerp(PAL.forest, clamp((e - 260) / 440, 0, 1));
    else if (e < 2200) tmp.copy(PAL.forest).lerp(PAL.scrub, clamp((e - 1800) / 400, 0, 1));
    else if (e < 2900) tmp.copy(PAL.scrub).lerp(PAL.rock, clamp((e - 2200) / 700, 0, 1));
    else tmp.copy(PAL.rock).lerp(PAL.snow, clamp((e - 2900) / 400, 0, 1));
    tmp.offsetHSL(0, 0, n * 0.025 - clamp(s - 0.15, 0, 0.4) * 0.12);
    cols[k * 3] = tmp.r; cols[k * 3 + 1] = tmp.g; cols[k * 3 + 2] = tmp.b;
  }
  tGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  tGeo.computeVertexNormals();
  const terrain = new THREE.Mesh(tGeo, track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 })));
  terrain.receiveShadow = terrain.castShadow = true;
  scene.add(terrain);

  // cut sides: soil strata down to a dark plinth, like a museum model
  {
    const edge: [number, number][] = [];
    for (let i = 0; i < GW; i++) edge.push([i, 0]);
    for (let j = 1; j < GH; j++) edge.push([GW - 1, j]);
    for (let i = GW - 2; i >= 0; i--) edge.push([i, GH - 1]);
    for (let j = GH - 2; j >= 0; j--) edge.push([0, j]);
    const bands: [number, string][] = [[0, '#6f5b42'], [0.08, '#8a7152'], [0.16, '#6a563f'], [0.26, '#9a8263'], [0.4, '#57483a']];
    const P: number[] = [], Cc: number[] = [], idx: number[] = [];
    for (const [i, j] of edge) {
      const x = (i / (GW - 1) - 0.5) * SX, z = (j / (GH - 1) - 0.5) * SZ, top = HM[j * GW + i] * YS;
      const ys = [top, ...bands.slice(1).map((b) => Math.min(top - 0.005, -b[0] + 0.06)), BASE];
      ys.forEach((y, r) => { P.push(x, Math.max(y, BASE), z); const c = C(bands[Math.min(r, bands.length - 1)][1]); Cc.push(c.r, c.g, c.b); });
    }
    const R = bands.length + 1;
    for (let n = 0; n < edge.length - 1; n++) for (let r = 0; r < R - 1; r++) { const a = n * R + r, b = a + 1, c = a + R, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = track(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3));
    g.setIndex(idx); g.computeVertexNormals();
    const sides = new THREE.Mesh(g, track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide })));
    sides.receiveShadow = true; scene.add(sides);
    const plinth = new THREE.Mesh(track(new RoundedBoxGeometry(SX + 0.5, 0.16, SZ + 0.5, 3, 0.05)), track(new THREE.MeshStandardMaterial({ color: '#262b28', roughness: 0.55, metalness: 0.1 })));
    plinth.position.y = BASE - 0.08; plinth.receiveShadow = true; scene.add(plinth);
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const cx = cv.getContext('2d')!;
    const gr = cx.createRadialGradient(64, 64, 10, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = gr; cx.fillRect(0, 0, 128, 128);
    const sh = new THREE.Mesh(track(new THREE.PlaneGeometry(SX * 1.7, SZ * 1.6)), track(new THREE.MeshBasicMaterial({ map: track(new THREE.CanvasTexture(cv)), transparent: true, depthWrite: false })));
    sh.rotation.x = -Math.PI / 2; sh.position.y = BASE - 0.17; scene.add(sh);
  }

  /* ---------- forest ---------- */
  {
    const c1 = new THREE.ConeGeometry(0.026, 0.055, 6); c1.translate(0, 0.045, 0);
    const c2 = new THREE.ConeGeometry(0.018, 0.045, 6); c2.translate(0, 0.075, 0);
    const trunk = new THREE.CylinderGeometry(0.004, 0.005, 0.02, 5); trunk.translate(0, 0.01, 0);
    const N = mobile ? 4500 : 8500;
    const mesh = new THREE.InstancedMesh(track(merge([c1, c2, trunk])), track(new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true })), N);
    mesh.castShadow = mesh.receiveShadow = true;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    const tints = ['#2f5238', '#3a5f41', '#44663d', '#2b4634', '#4f6e45'].map(C);
    let n = 0, guard = 0;
    while (n < N && guard++ < N * 30) {
      const u = rnd(), v = rnd(), e = hAt(u, v);
      if (e < 650 || e > 2250 || slopeAt(u, v) > 0.55 || townAt(u, v)) continue;
      const dens = 0.55 + 0.45 * Math.sin(u * 40 + Math.cos(v * 33) * 2) * Math.sin(v * 37 + u * 9);
      if (rnd() > dens) continue;
      const s = 0.7 + rnd() * 0.6;
      q.setFromAxisAngle(up, rnd() * 6.28); sc.set(s, s * (0.9 + rnd() * 0.3), s);
      m4.compose(W3(u, v, -0.004), q, sc); mesh.setMatrixAt(n, m4); mesh.setColorAt(n, tints[Math.floor(rnd() * tints.length)]); n++;
    }
    mesh.count = n; scene.add(mesh);
  }

  /* ---------- the plant's footprint (built further down; the towns keep clear of it) ---------- */
  const onPlantPad = (u: number, v: number) => Math.abs(u - PLANT_UV[0]) * SX < PAD.w / 2 + 0.03 && Math.abs(v - PLANT_UV[1]) * SZ < PAD.d / 2 + 0.03;

  /* ---------- towns: houses fill each town's real footprint, so its shape reads from above ---------- */
  const glowPts: THREE.Vector3[] = [], glowTown: string[] = [], glowDelay: number[] = [], glowRipple: number[] = [];
  const houseGlow = { color: new THREE.Color('#ffb03a'), lit: null as THREE.InstancedBufferAttribute | null };
  {
    const body = new RoundedBoxGeometry(0.022, 0.014, 0.018, 1, 0.002); body.translate(0, 0.007, 0);
    const roof = new THREE.ConeGeometry(0.017, 0.01, 4); roof.rotateY(Math.PI / 4); roof.scale(1, 1, 0.8); roof.translate(0, 0.019, 0);
    // one house per cell of a jittered grid, so each town's footprint follows its boundary
    const GAP = mobile ? 0.046 : 0.034, du = GAP / SX, dv = GAP / SZ;
    const spots: { u: number; v: number; name: string; core: number }[] = [];
    for (const t of TOWNS) {
      const [cu, cv] = PLACES[t.name];
      for (let v = t.box[1]; v <= t.box[3]; v += dv) for (let u = t.box[0]; u <= t.box[2]; u += du) {
        const uu = u + (rnd() - 0.5) * du * 0.7, vv = v + (rnd() - 0.5) * dv * 0.7, e = hAt(uu, vv), s = slopeAt(uu, vv);
        if (!inRings(t.rings, uu, vv) || isLake(uu, vv, e, s) || onPlantPad(uu, vv)) continue;
        // steep ground and the odd open lot stay empty, as in the real towns
        if (s > 0.14 || rnd() < 0.12 + clamp((s - 0.06) / 0.08, 0, 1) * 0.5) continue;
        spots.push({ u: uu, v: vv, name: t.name, core: clamp(1 - Math.hypot((uu - cu) * SX, (vv - cv) * SZ) / 0.35, 0, 1) });
      }
    }
    // powered houses glow from within: a per-house 0–1 'lit' value added to the material's emissive light
    const geo = track(merge([body, roof]));
    houseGlow.lit = new THREE.InstancedBufferAttribute(new Float32Array(spots.length), 1);
    houseGlow.lit.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aLit', houseGlow.lit);
    const houseMat = track(new THREE.MeshStandardMaterial({ color: '#efe9de', roughness: 0.8 }));
    houseMat.onBeforeCompile = (sh) => {
      sh.uniforms.litColor = { value: houseGlow.color };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aLit; varying float vLit;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLit = aLit;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 litColor; varying float vLit;')
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(.95, .3, .03), clamp(vLit, 0., 1.) * .9);')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += litColor * vLit;');
    };
    const mesh = new THREE.InstancedMesh(geo, houseMat, spots.length);
    mesh.castShadow = mesh.receiveShadow = true;
    const reach: Record<string, number> = {}, far = (q: (typeof spots)[number]) => Math.hypot((q.u - PLACES[q.name][0]) * SX, (q.v - PLACES[q.name][1]) * SZ);
    for (const q of spots) reach[q.name] = Math.max(reach[q.name] ?? 0.01, far(q));
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    spots.forEach(({ u, v, name, core }, n) => {
      q.setFromAxisAngle(up, (Math.round(rnd() * 4) * Math.PI) / 2 + (rnd() - 0.5) * 0.3);
      const k = 0.85 + rnd() * 0.3 + core * 0.35; // a little bigger and taller toward downtown
      sc.set(k, k * (1 + core * rnd() * 1.4), k);
      const p = W3(u, v); m4.compose(p, q, sc); mesh.setMatrixAt(n, m4);
      glowPts.push(p.clone().add(new THREE.Vector3(0, 0.03, 0))); glowTown.push(name);
      glowDelay.push(clamp(Math.hypot(u - PLACES.Anderson[0], v - PLACES.Anderson[1]) / 0.45, 0, 1));
      glowRipple.push(far(spots[n]) / reach[name]); // 0 downtown → 1 at the town's edge
    });
    scene.add(mesh);
  }

  /* ---------- the plant: footprint from the aerial view, structures from site photos (see plant.ts) ---------- */
  const mat = (color: string, o: THREE.MeshStandardMaterialParameters = {}) => track(new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...o }));
  const windowMat = mat('#39424a', { emissive: new THREE.Color('#ffc766'), emissiveIntensity: 0, roughness: 0.4 });
  const kit = { track, mat, merge, windowMat, rnd };
  const site = buildPlant(kit), plant = site.group;
  plant.position.copy(W3(...PLANT_UV)); scene.add(plant);
  plant.updateMatrixWorld(true);
  const PL = (p: THREE.Vector3) => p.clone().applyMatrix4(plant.matrixWorld); // plant-local → world
  const STACK_TOPS = site.at.stackTops.map(PL), SUB = PL(site.at.sub);
  const toUV = (p: THREE.Vector3): [number, number] => [p.x / SX + 0.5, p.z / SZ + 0.5];

  /* ---------- power lines + haul routes (illustrative) ---------- */
  const lineMat = mat('#b98a26', { emissive: new THREE.Color('#ffb42e'), emissiveIntensity: 0.1, roughness: 0.5, metalness: 0.3 });
  const pylonGeo = (() => { const a = new THREE.CylinderGeometry(0.0015, 0.0045, 0.065, 4); a.translate(0, 0.0325, 0); const b = new THREE.BoxGeometry(0.024, 0.0025, 0.0025); b.translate(0, 0.06, 0); return track(merge([a, b])); })();
  const pylonMat = mat('#6f7775', { metalness: 0.4 });
  const gridCurves: THREE.Curve<THREE.Vector3>[] = [], haulCurves: THREE.Curve<THREE.Vector3>[] = [];
  let reddingLine: THREE.Curve<THREE.Vector3> | null = null;
  const overland = (from: [number, number], to: [number, number], lift: number, bend = 0) => {
    const pts: THREE.Vector3[] = [];
    for (let t = 0; t <= 1.0001; t += 1 / 40) {
      const u = lerp(from[0], to[0], t) + Math.sin(t * Math.PI) * bend * (to[1] - from[1]);
      const v = lerp(from[1], to[1], t) - Math.sin(t * Math.PI) * bend * (to[0] - from[0]);
      pts.push(W3(u, v, lift));
    }
    return pts;
  };
  // the grid hub sits west of the site and north of Anderson, so lines to every town clear both
  const HUB_UV: [number, number] = [PLANT_UV[0] - 0.6 / SX, PLANT_UV[1] - 0.2 / SZ];
  const HUB = W3(...HUB_UV, 0.06);
  {
    const c = new THREE.CatmullRomCurve3([SUB.clone(), SUB.clone().lerp(HUB, 0.5).add(new THREE.Vector3(0, 0.02, 0)), HUB.clone()]);
    gridCurves.push(c); scene.add(new THREE.Mesh(track(new THREE.TubeGeometry(c, 40, 0.0028, 5)), lineMat));
  }
  for (const { name } of TOWNS) {
    if (name === 'Anderson') continue;
    const c = new THREE.CatmullRomCurve3(overland(HUB_UV, PLACES[name], 0.06, 0.12));
    gridCurves.push(c); scene.add(new THREE.Mesh(track(new THREE.TubeGeometry(c, 120, 0.0028, 5)), lineMat));
    if (name === 'Redding') reddingLine = c;
    const n = Math.max(2, Math.floor(c.getLength() / 0.35));
    const pyl = new THREE.InstancedMesh(pylonGeo, pylonMat, n); pyl.castShadow = true;
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) { const p = c.getPointAt((i + 0.5) / n); const [u, v] = toUV(p); m4.makeTranslation(p.x, hAt(u, v) * YS, p.z); pyl.setMatrixAt(i, m4); }
    scene.add(pyl);
  }
  { const c = new THREE.CatmullRomCurve3(overland(HUB_UV, [0.5, 1.0], 0.06, -0.05)); gridCurves.push(c); scene.add(new THREE.Mesh(track(new THREE.TubeGeometry(c, 80, 0.0028, 5)), lineMat)); }

  // the featured power route we follow out of the plant
  const feeder = gridCurves[0];
  const heroGrid = new THREE.CatmullRomCurve3([...feeder.getPoints(16), ...reddingLine!.getPoints(90).slice(1)]);
  const heroLineMat = mat('#e0a92e', { emissive: new THREE.Color('#ffb42e'), emissiveIntensity: 0.2, roughness: 0.4, metalness: 0.2 });
  scene.add(new THREE.Mesh(track(new THREE.TubeGeometry(heroGrid, 240, 0.0042, 6)), heroLineMat));

  const haulMat = track(new THREE.LineDashedMaterial({ color: '#2f7a45', dashSize: 0.06, gapSize: 0.05, transparent: true, opacity: 0.55 }));
  const sources: [number, number][] = [];
  {
    const zones = [[0.1, 0.22, 0.45, 0.6], [0.62, 0.6, 0.95, 0.95], [0.35, 0.2, 0.6, 0.42]];
    for (let g = 0; sources.length < 15 && g < 5000; g++) {
      const z = zones[sources.length % 3], u = lerp(z[0], z[2], rnd()), v = lerp(z[1], z[3], rnd()), e = hAt(u, v);
      if (e > 800 && e < 1900) sources.push([u, v]);
    }
    // every haul road turns in off Industry Rd at the north gate and ends at the truck dumpers; eastern roads come along Industry Rd
    const entry = site.at.entry.map((p) => PL(p).add(new THREE.Vector3(0, 0.012, 0)));
    const gate = toUV(entry[0]), east: [number, number] = [gate[0] + 0.06, gate[1] - 0.01];
    for (const s of sources) {
      const pts = s[0] > PLANT_UV[0]
        ? [...overland(s, east, 0.018, 0.12), ...overland(east, gate, 0.018, 0).slice(1)]
        : overland(s, gate, 0.018, 0.18);
      pts.push(...entry.slice(1));
      const c = new THREE.CatmullRomCurve3(pts); haulCurves.push(c);
      const ln = new THREE.Line(track(new THREE.BufferGeometry().setFromPoints(c.getPoints(160))), haulMat);
      ln.computeLineDistances(); scene.add(ln);
    }
  }
  let heroIdx = 0, best = Infinity;
  sources.forEach((s, i) => { const d = Math.hypot(s[0] - 0.3, s[1] - 0.42) + (s[0] > PLANT_UV[0] ? 1 : 0); if (d < best) { best = d; heroIdx = i; } });
  const heroHaul = haulCurves[heroIdx];
  // where the truck turns in at the gate: from here the chase camera stops turning with it while it laps the yard
  const HAUL_GATE = (() => {
    const g = PL(site.at.entry[0]); let bi = 0, bd = Infinity;
    for (let i = 0; i <= 400; i++) { const d = heroHaul.getPointAt(i / 400).distanceToSquared(g); if (d < bd) { bd = d; bi = i; } }
    return bi / 400;
  })();
  const heroSrc = W3(...sources[heroIdx], 0.02);
  const heroRoadMat = track(new THREE.MeshBasicMaterial({ color: '#2f7a45', transparent: true, opacity: 0.3, depthWrite: false }));
  scene.add(new THREE.Mesh(track(new THREE.TubeGeometry(heroHaul, 260, 0.0035, 5)), heroRoadMat));
  // the chip truck we follow: +z is forward
  const truck = makeTruck(kit);
  scene.add(truck);
  const inside = {
    fuel: new THREE.CatmullRomCurve3(site.at.fuel.map(PL)),
    steam: new THREE.CatmullRomCurve3(site.at.steam.map(PL)),
    power: new THREE.CatmullRomCurve3(site.at.power.map(PL)),
  };

  /* ---------- particles ---------- */
  type Pt = { x: number; y: number; z: number; c: THREE.Color; s: number; a: number };
  function makePoints(cap: number, additive: boolean) {
    const g = track(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cap * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cap * 3), 3));
    g.setAttribute('size', new THREE.BufferAttribute(new Float32Array(cap), 1));
    g.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(cap), 1));
    const m = track(new THREE.ShaderMaterial({
      uniforms: { scale: { value: 400 } },
      vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vC; varying float vA; uniform float scale;
        void main(){ vC=color; vA=alpha; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=max(size*scale/-mv.z,1.6); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vC; varying float vA; void main(){ float r=length(gl_PointCoord-.5); float a=smoothstep(.5,.15,r)*vA; if(a<.01) discard; gl_FragColor=vec4(vC,a); }`,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    }));
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts);
    const write = (list: Pt[]) => {
      const P = g.attributes.position.array as Float32Array, Cc = g.attributes.color.array as Float32Array;
      const S = g.attributes.size.array as Float32Array, A = g.attributes.alpha.array as Float32Array;
      const n = Math.min(list.length, cap);
      for (let i = 0; i < n; i++) { const q = list[i]; P[i * 3] = q.x; P[i * 3 + 1] = q.y; P[i * 3 + 2] = q.z; Cc[i * 3] = q.c.r; Cc[i * 3 + 1] = q.c.g; Cc[i * 3 + 2] = q.c.b; S[i] = q.s; A[i] = q.a; }
      A.fill(0, n);
      for (const k of ['position', 'color', 'size', 'alpha']) g.attributes[k].needsUpdate = true;
    };
    return { m, write };
  }
  const matte = makePoints(1400, false), glow = makePoints(1600 + glowPts.length, true), plume = makePoints(160, false);
  type Flow = { c: THREE.Curve<THREE.Vector3>; t: number; v: number; kind: 'h' | 'f' | 's' | 'p' | 'g'; o: number; s: number };
  const isHero = (c: THREE.Curve<THREE.Vector3>) => c === heroHaul || c === feeder || c === reddingLine;
  const flows: Flow[] = [];
  const cFuel = C('#3f8a4f'), cChip = C('#9a7653'), cSteam = C('#dbe8f3'), cGold = C('#ffc24a');
  const spawn = (c: THREE.Curve<THREE.Vector3>, kind: Flow['kind'], v: number) => flows.push({ c, t: 0, v, kind, o: (rnd() - 0.5) * 0.012, s: 0.7 + rnd() * 0.6 });
  const plumeP = Array.from({ length: 160 }, (_, i) => ({ t: i / 160, k: i % 3, x: (rnd() - 0.5) * 0.008, z: (rnd() - 0.5) * 0.008 }));
  if (reduce) for (let i = 0; i < 300; i++) { const g = i % 3 === 0; flows.push({ c: g ? gridCurves[i % gridCurves.length] : haulCurves[i % haulCurves.length], t: rnd(), v: 0, kind: g ? 'g' : 'h', o: 0, s: 1 }); }

  /* ---------- lights ---------- */
  const hemi = new THREE.HemisphereLight('#dbe9f6', '#6b5f49', 1.1); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff3de', 2.8);
  sun.castShadow = true; sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 70 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  const moon = new THREE.DirectionalLight('#9db6ff', 0); moon.position.set(-8, 14, -6); scene.add(moon);
  const starMat = track(new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false }));
  {
    const n = 500, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const a = rnd() * 6.28, e = 0.15 + rnd() * 1.3, r = 70; p[i * 3] = Math.cos(a) * Math.cos(e) * r; p[i * 3 + 1] = Math.sin(e) * r; p[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r; }
    const g = track(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    scene.add(new THREE.Points(g, starMat));
  }
  let night = false, baseWindow = 0;
  function setLight(s: SunState) {
    night = s.night;
    const a = Math.max(s.alt, 2) * RAD, zr = s.az * RAD;
    sun.position.set(Math.sin(zr) * Math.cos(a), Math.sin(a), -Math.cos(zr) * Math.cos(a)).multiplyScalar(30);
    sun.color.set('#fff4e2').lerp(C('#ffac5e'), s.warm);
    sun.intensity = night ? 0 : lerp(2.2, 2.8, clamp((s.alt - 2) / 20, 0, 1));
    hemi.color.set(night ? '#27406b' : s.warm > 0.5 ? '#f3d6b8' : '#dbe9f6');
    hemi.groundColor.set(night ? '#0b0d12' : '#6b5f49');
    hemi.intensity = night ? 0.55 : lerp(1.0, 1.1, clamp(s.alt / 20, 0, 1));
    moon.intensity = night ? 0.9 : 0;
    baseWindow = s.alt < 4 ? 0.9 : 0;
    windowMat.emissiveIntensity = night ? 2.4 : baseWindow;
    lineMat.emissiveIntensity = night ? 1.6 : 0.12;
    haulMat.color.set(night ? '#7fd192' : '#2f7a45');
    heroRoadMat.color.set(night ? '#8fe3a2' : '#1f6b38');
    starMat.opacity = night ? 0.85 : 0;
    renderer.toneMappingExposure = night ? 1.05 : s.warm > 0.5 ? 1.12 : 1;
    glow.m.blending = night ? THREE.AdditiveBlending : THREE.NormalBlending;
  }

  /* ---------- labels ---------- */
  type Label = { d: HTMLDivElement; p: THREE.Vector3; a: number; part: boolean };
  const mk = (html: string, p: THREE.Vector3, cls = ''): Label => {
    const d = document.createElement('div'); d.className = `lbl ${cls}`; d.innerHTML = html; labels.appendChild(d);
    return { d, p, a: 0, part: cls === 'part' };
  };
  const LBL: Record<string, Label> = {
    shasta: mk('Mt. Shasta<small>14,179 ft</small>', W3(...PLACES['Mt. Shasta'], 0.05)),
    lassen: mk('Lassen Peak<small>10,457 ft</small>', W3(...PLACES['Lassen Peak'], 0.05)),
    srm: mk('SRM · Anderson', PL(site.at.srm)),
    redding: mk('Redding', W3(...PLACES.Redding, 0.04), 'minor'),
    bluff: mk('Red Bluff', W3(...PLACES['Red Bluff'], 0.04), 'minor'),
    burney: mk('Burney', W3(...PLACES.Burney, 0.04), 'minor'),
    stnf: mk('Shasta-Trinity National Forest', W3(0.27, 0.38, 0.08), 'minor'),
    lnf: mk('Lassen National Forest', W3(0.8, 0.83, 0.08), 'minor'),
    yard: mk('Fuel yard', PL(site.at.yardLabel), 'part'),
    boiler: mk('Boilers', PL(site.at.boilerLabel), 'part'),
    turbine: mk('Turbine hall · 55 MW', PL(site.at.turbineLabel), 'part'),
    sub: mk('Substation', PL(site.at.subLabel), 'part'),
  };
  const labelSet = (step: number) => {
    const m: Record<string, number> = { shasta: 1, lassen: 1, srm: 1, redding: 1, bluff: 1, burney: 1, stnf: 0, lnf: 0, yard: 0, boiler: 0, turbine: 0, sub: 0 };
    if (step === 0 || step === 1) m.stnf = m.lnf = 1;
    if (step === 2) m.stnf = m.lnf = 0.8;
    if (step === 6) m.sub = 1; // the power leaves from the substation
    if (step >= 3 && step <= 5) {
      Object.assign(m, { shasta: 0, lassen: 0, redding: 0, bluff: 0, burney: 0, srm: 0 });
      m.yard = step === 3 ? 1 : 0.5; m.boiler = step === 4 ? 1 : 0.5; m.turbine = step >= 4 ? 1 : 0;
    }
    return m;
  };

  /* ---------- camera path ---------- */
  // Each step has a shot. Steps 3 and 7–8 are tracking shots: the camera rides behind the chip truck,
  // then behind a pulse of electricity from the substation to Redding, and only pulls out at the very end.
  const OVER = new THREE.Vector3(0, 0.15, 0.4);
  type Key = [THREE.Vector3, number, number, number]; // target, distance, azimuth°, elevation°
  const HERO: Key = mobile ? [new THREE.Vector3(0, 0.15, 0.2), 30, -12, 42] : [OVER, 35, -14, 36];
  const FINAL: Key = mobile ? [OVER, 26, 4, 52] : [OVER, 18, 4, 48];
  const YARDW = PL(site.tippers[0].base.position).lerp(PL(site.at.yard), 0.2).setY(PL(site.at.yard).y), // the tippers, with the yard beyond
     BOILW = PL(site.at.boiler), TURBW = PL(site.at.turbine);
  const CLOSE = mobile ? 1.45 : 1; // a portrait phone sees far less width, so the plant close-ups pull back
  const haulT = (sf: number) => clamp((sf - 1.55) / 1.35, 0, 1);  // truck leaves partway through Chipping, reaches the tipper as The haul ends
  // along the haul the truck eases out, cruises at a steady speed, then brakes (peak speed ~1.2× average, not 3×)
  const cruise = (t: number, a = 0.18) => { const v = 1 / (1 - a); return t < a ? (v * t * t) / (2 * a) : t > 1 - a ? 1 - (v * (1 - t) ** 2) / (2 * a) : v * (t - a / 2); };
  const haulPos = (sf: number) => cruise(haulT(sf));
  const gridT = (sf: number) => clamp((sf - 5.8) / 1.7, 0, 1);  // pulse leaves the substation as The grid begins, reaches Redding mid-Your home
  const pa = new THREE.Vector3(), pb = new THREE.Vector3();
  const heading = (c: THREE.Curve<THREE.Vector3>, t: number) => {
    c.getPointAt(clamp(t - 0.02, 0, 1), pa); c.getPointAt(clamp(t + 0.02, 0, 1), pb);
    return Math.atan2(-(pb.x - pa.x), -(pb.z - pa.z)) / RAD; // camera sits behind the direction of travel
  };
  const chase = (c: THREE.Curve<THREE.Vector3>, t: number, dist: number, el: number, side: number): Key => [c.getPointAt(t), dist, heading(c, t) + side, el];
  const angLerp = (a: number, b: number, t: number) => a + ((((b - a) % 360) + 540) % 360 - 180) * t;
  const blend = (a: Key, b: Key, m: number): Key => [a[0].clone().lerp(b[0], m), Math.exp(lerp(Math.log(a[1]), Math.log(b[1]), m)), angLerp(a[2], b[2], m), lerp(a[3], b[3], m)];
  function shot(step: number, sf: number): Key {
    switch (step) {
      case -1: return HERO;
      case 0: return [heroSrc, lerp(5.4, 4.4, clamp(sf, 0, 1)), -28, 30];
      case 1: return [heroSrc, 2.3, -48, 24];
      case 2: { const t = haulPos(sf); return [heroHaul.getPointAt(t), 1.9, heading(heroHaul, Math.min(t, HAUL_GATE)) + 32, 26]; }
      case 3: return [YARDW, 1.1 * CLOSE, 95, 22];
      case 4: return [BOILW, 1.2 * CLOSE, -32, 16];
      case 5: return [TURBW, 1.2 * CLOSE, -140, 20];
      case 6: return chase(heroGrid, gridT(sf), 1.9, 31, 34);
      default: return blend(chase(heroGrid, gridT(sf), 1.9, 31, 34), FINAL, ease(clamp((sf - 7.5) / 0.42, 0, 1)));
    }
  }
  // when, within each step, the camera starts easing toward the next step's opening shot (1 = no hand-off needed)
  const HANDOFF: Record<number, number> = { [-1]: 0.45, 0: 0.6, 1: 0.72, 2: 0.86, 3: 0.55, 4: 0.55, 5: 0.6, 6: 1, 7: 1 };
  const start = HERO;
  const cam = { t: start[0].clone(), d: start[1], az: start[2], el: start[3] };
  const focus = { haul: 0, grid: 0 };
  const I = { haul: 0.5, inside: 0.4, grid: 0.8 };
  const targets = (step: number) =>
    step < 0 ? { haul: 0.5, inside: 0.4, grid: 0.8 }
    : step <= 1 ? { haul: 0.15, inside: 0, grid: 0.1 }
    : step <= 3 ? { haul: 1, inside: step === 3 ? 0.7 : 0.2, grid: 0.1 }
    : step <= 5 ? { haul: 0.3, inside: 1, grid: 0.2 }
    : { haul: 0.2, inside: 0.4, grid: 1 };

  let W = 1, H = 1, clock = 0, pointerX = 0;
  const onPointer = (e: PointerEvent) => { pointerX = e.clientX / innerWidth - 0.5; };
  addEventListener('pointermove', onPointer);
  const v3 = new THREE.Vector3(), tipM = new THREE.Matrix4(), tipQ = new THREE.Quaternion(), tipS = new THREE.Vector3();

  return {
    resize(w, h) {
      W = w; H = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      for (const s of [matte, glow, plume]) s.m.uniforms.scale.value = h * 0.5;
    },
    setLight,
    frame(dt, sf, step) {
      clock += reduce ? 0 : dt;
      // camera: this step's shot, handing off to the next step's opening shot near the end
      const i = Math.floor(sf), u = sf - i, g = HANDOFF[i] ?? 0.6;
      const here = shot(i, sf), aim = g >= 1 || i >= 7 ? here : blend(here, shot(i + 1, i + 1), ease(clamp((u - g) / (1 - g), 0, 1)));
      const k = reduce ? 1 : Math.min(1, dt * 4);
      cam.t.lerp(aim[0], k);
      cam.d = lerp(cam.d, aim[1], k);
      cam.az = angLerp(cam.az, aim[2], k);
      cam.el = lerp(cam.el, aim[3], k);
      const sway = reduce ? 0 : step < 0 ? Math.sin(clock * 0.12) * 5 + pointerX * 6 : pointerX * 2;
      const az = (cam.az + sway) * RAD, el = cam.el * RAD;
      camera.position.set(cam.t.x + cam.d * Math.sin(az) * Math.cos(el), cam.t.y + cam.d * Math.sin(el), cam.t.z + cam.d * Math.cos(az) * Math.cos(el));
      camera.lookAt(cam.t);
      camera.setViewOffset(W, H, mobile ? 0 : (step < 0 ? -0.235 : -0.17) * W, mobile ? (step < 0 ? -0.2 : 0.12) * H : 0, W, H);

      const mList: Pt[] = [], gList: Pt[] = [];
      // the chip truck we follow
      {
        const t = haulPos(sf);
        heroHaul.getPointAt(t, pa); heroHaul.getPointAt(Math.min(1, t + 0.01), pb);
        truck.position.copy(pa).y -= 0.012;
        if (pb.distanceToSquared(pa) > 1e-10) truck.lookAt(pb.x, truck.position.y, pb.z);
        else { heroHaul.getPointAt(Math.max(0, t - 0.01), pb); truck.lookAt(2 * pa.x - pb.x, truck.position.y, 2 * pa.z - pb.z); }
      }
      // the entrance-lawn turkeys peck at the grass, each on its own rhythm
      for (const tk of site.turkeys) tk.head.rotation.x = Math.pow(Math.max(0, Math.sin(clock * 1.2 + tk.phase)), 6) * 1.2;
      // truck tippers: ours lifts once the truck is on the deck during Fuel yard, the other cycles on its own
      {
        const [ours, other] = site.tippers;
        const up = ease(clamp((sf - 2.95) / 0.3, 0, 1)) * (1 - ease(clamp((sf - 3.6) / 0.3, 0, 1)));
        const c = (clock % 14) / 14, cyc = ease(clamp((c - 0.15) / 0.2, 0, 1)) * (1 - ease(clamp((c - 0.65) / 0.2, 0, 1)));
        ours.setTilt(up * 0.85); other.setTilt(cyc * 0.85);
        for (const tp of site.tippers) tp.base.updateMatrixWorld(true);
        if (haulT(sf) >= 1) {
          tipM.compose(ours.truckAt, tipQ.identity(), tipS.set(1, 1, 1)).premultiply(ours.tilt.matrixWorld);
          tipM.decompose(truck.position, truck.quaternion, truck.scale);
        }
        // chips slide out the back doors into the pit
        for (const [tp, a] of [[ours, up], [other, cyc]] as const) {
          if (a < 0.55) continue;
          tp.tilt.localToWorld(pa.copy(tp.rear)); tp.base.localToWorld(pb.copy(tp.pit));
          for (let n = 0; n < 24; n++) {
            const f = (clock * 1.4 + n / 24) % 1;
            v3.copy(pa).lerp(pb, f); v3.y += Math.sin(f * Math.PI) * 0.004;
            mList.push({ x: v3.x + Math.sin(n * 7.3) * 0.006, y: v3.y, z: v3.z + Math.cos(n * 5.1) * 0.006, c: n % 3 ? cChip : cFuel, s: 0.016, a: Math.min(1, (a - 0.55) * 4) * (1 - f * 0.4) });
          }
        }
      }
      const fk = reduce ? 1 : Math.min(1, dt * 3);
      focus.haul = lerp(focus.haul, step >= 0 && step <= 3 ? 1 : 0, fk);
      focus.grid = lerp(focus.grid, step >= 6 && sf < 7.55 ? 1 : 0, fk);

      // flows
      const T = targets(step);
      for (const key of Object.keys(I) as (keyof typeof I)[]) I[key] = lerp(I[key], T[key], reduce ? 1 : Math.min(1, dt * 2.5));
      if (!reduce) {
        if (rnd() < (mobile ? 10 : 22) * I.haul * dt) spawn(haulCurves[Math.floor(rnd() * haulCurves.length)], 'h', 0.07 + rnd() * 0.04);
        if (rnd() < 8 * focus.haul * dt) spawn(heroHaul, 'h', 0.08 + rnd() * 0.03);
        if (rnd() < 14 * focus.grid * dt) spawn(rnd() < 0.2 ? feeder : reddingLine!, 'g', 0.2 + rnd() * 0.06);
        if (rnd() < 7 * I.inside * dt) spawn(inside.fuel, 'f', 0.5);
        if (rnd() < 6 * I.inside * dt) spawn(inside.steam, 's', 0.55);
        if (rnd() < 7 * I.inside * dt) spawn(inside.power, 'p', 0.9);
        if (rnd() < (mobile ? 14 : 30) * I.grid * dt) spawn(gridCurves[Math.floor(rnd() * gridCurves.length)], 'g', 0.16 + rnd() * 0.08);
        for (const f of flows) f.t += f.v * dt;
        for (let i = flows.length - 1; i >= 0; i--) if (flows[i].t >= 1) flows.splice(i, 1);
        if (flows.length > 2400) flows.splice(0, flows.length - 2400);
      }
      for (const f of flows) {
        f.c.getPointAt(Math.min(f.t, 1), v3);
        const fade = Math.min(1, f.t * 8, (1 - f.t) * 8);
        const hero = isHero(f.c);
        if (f.kind === 'h') mList.push({ x: v3.x, y: v3.y + 0.01, z: v3.z + (hero ? 0 : f.o), c: f.s > 1.1 ? cChip : cFuel, s: 0.022 * f.s * (hero ? 1.25 : 1), a: fade * Math.min(1, I.haul * 1.5) * (hero ? 1 : 1 - 0.65 * focus.haul) });
        else if (f.kind === 'f') mList.push({ x: v3.x, y: v3.y + 0.006, z: v3.z, c: cChip, s: 0.012, a: fade * I.inside });
        else if (f.kind === 's') mList.push({ x: v3.x, y: v3.y, z: v3.z, c: cSteam, s: 0.014 + f.t * 0.01, a: fade * 0.9 * I.inside });
        else if (f.kind === 'p') gList.push({ x: v3.x, y: v3.y, z: v3.z, c: cGold, s: 0.014, a: fade * I.inside });
        else gList.push({ x: v3.x, y: v3.y + 0.004, z: v3.z, c: cGold, s: (night ? 0.05 : 0.034) * f.s, a: fade * Math.min(1, I.grid * 1.3) * (hero ? 1 : 1 - 0.55 * focus.grid) });
      }
      const e = gridT(sf);
      if (step >= 5 && e > 0 && e < 1) {
        for (let n = 0; n < 7; n++) {
          const t = e - n * 0.009; if (t <= 0) break;
          heroGrid.getPointAt(t, v3);
          gList.push({ x: v3.x, y: v3.y + 0.004, z: v3.z, c: cGold, s: (night ? 0.12 : 0.095) * (1 - n * 0.12), a: 1 - n * 0.13 });
        }
      }
      // windows: Redding lights as the pulse arrives, then the rest of the North State as we pull out
      // each town powers up from downtown outward: every house flashes bright as it switches on, then holds a warm glow
      const arrive = step >= 6 ? clamp((e - 0.9) / 0.1, 0, 1) : 0, spread = clamp((sf - 7.5) / 0.4, 0, 1);
      const litArr = houseGlow.lit!.array as Float32Array;
      houseGlow.color.set(night ? '#ffb03a' : '#ffa62b').multiplyScalar(night ? 1.6 : 0.35);
      for (let n = 0; n < glowPts.length; n++) {
        const town = glowTown[n] === 'Redding' ? arrive : clamp(spread * 1.5 - glowDelay[n] * 0.5, 0, 1);
        const lit = clamp(town * 1.6 - glowRipple[n] * 0.6, 0, 1), flash = Math.sin(lit * Math.PI) * (lit < 1 ? 1 : 0);
        const tw = 0.8 + 0.2 * Math.sin(clock * 2 + glowPts[n].x * 40) ** 2;
        litArr[n] = (night ? 0.08 : 0) + lit * (0.85 + flash * 0.9);
        const a = Math.max(night ? 0.3 * tw : 0, lit * tw);
        if (a > 0.02) gList.push({ x: glowPts[n].x, y: glowPts[n].y, z: glowPts[n].z, c: cGold, s: (night ? 0.03 : 0.04) * (lit * (1 + flash * 1.5)) + (night ? 0.016 : 0), a: night ? a : a * 0.9 });
      }
      houseGlow.lit!.needsUpdate = true;
      windowMat.emissiveIntensity = night ? 2.4 : step === 7 ? 1.4 : baseWindow;
      haulMat.opacity = lerp(0.12 + 0.5 * I.haul, 0.16, focus.haul);
      heroRoadMat.opacity = 0.3 + 0.65 * focus.haul;
      lineMat.emissiveIntensity = night ? lerp(1.6, 0.6, focus.grid) : 0.12;
      heroLineMat.emissiveIntensity = night ? lerp(1.6, 2.6, focus.grid) : lerp(0.12, 0.9, focus.grid);
      matte.write(mList); glow.write(gList);
      plume.write(plumeP.map((q) => { const t = (q.t + clock * 0.08) % 1, st = STACK_TOPS[q.k]; return { x: st.x + q.x + t * 0.1, y: st.y + t * 0.25, z: st.z + q.z - t * 0.03, c: cSteam, s: 0.02 + t * 0.07, a: (1 - t) * (night ? 0.1 : 0.22) }; }));

      // labels
      const want = labelSet(step), keepOut = avoid();
      for (const [key, L] of Object.entries(LBL)) {
        v3.copy(L.p).project(camera);
        const x = (v3.x * 0.5 + 0.5) * W, y = (-v3.y * 0.5 + 0.5) * H;
        const lx = x + (L.part ? -L.d.offsetWidth / 2 : 12);
        const on = v3.z < 1 && x > 20 && x < W - 20 && y > 70 && y < H - 30 && !(mobile && step < 0) && !hits(keepOut, lx - 14, y - 12, L.d.offsetWidth + 14, L.d.offsetHeight + 4);
        L.a = lerp(L.a, on ? want[key] : 0, Math.min(1, dt * 5));
        L.d.style.opacity = L.a.toFixed(3);
        L.d.style.transform = `translate(${lx.toFixed(1)}px, ${(y - 10).toFixed(1)}px)`;
      }
      renderer.render(scene, camera);
    },
    dispose() {
      removeEventListener('pointermove', onPointer);
      for (const d of disposables) d.dispose();
      renderer.dispose();
      labels.replaceChildren();
    },
  };
}
