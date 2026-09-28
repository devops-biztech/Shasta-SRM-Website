// SRM's Anderson plant for the 3D diorama. The footprint follows the aerial view (north up) and the
// structures follow site photos: three boiler units in a row, each with an open steel boiler frame, a tan
// baghouse, a white cyclone silo and a tall stack with a platform ring. Heights and the power block are
// exaggerated so the plant still reads from across the valley.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const PAD = { w: 0.84, d: 0.693 };
const K = PAD.w / 926; // aerial screenshot is 926 px wide
const TOP = 0.003; // ground level on the pad
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/** aerial-photo pixel → plant-local ground point */
const A = (px: number, py: number, y = TOP) => V((px - 463) * K, y, (py - 382) * K);

export type PlantKit = {
  track: <T extends { dispose(): void }>(x: T) => T;
  mat: (color: string, o?: THREE.MeshStandardMaterialParameters) => THREE.MeshStandardMaterial;
  merge: (list: THREE.BufferGeometry[]) => THREE.BufferGeometry;
  windowMat: THREE.Material;
  rnd: () => number;
};

/** A chip truck, +z forward, sitting on y = 0. */
export function makeTruck({ track, mat, windowMat }: PlantKit, body = '#5f6b64') {
  const t = new THREE.Group();
  const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => { const o = new THREE.Mesh(track(g), m); o.position.set(x, y, z); o.castShadow = true; t.add(o); };
  add(new RoundedBoxGeometry(0.026, 0.024, 0.07, 2, 0.003), mat(body), 0, 0.016, -0.012);
  add(new RoundedBoxGeometry(0.024, 0.012, 0.064, 2, 0.004), mat('#8b6b49', { roughness: 1 }), 0, 0.031, -0.012);
  add(new RoundedBoxGeometry(0.026, 0.026, 0.024, 2, 0.004), mat('#eceae4'), 0, 0.017, 0.037);
  add(new THREE.BoxGeometry(0.02, 0.008, 0.002), windowMat, 0, 0.022, 0.0495);
  const wheel = new THREE.CylinderGeometry(0.0065, 0.0065, 0.03, 12); wheel.rotateZ(Math.PI / 2);
  for (const z of [-0.035, -0.01, 0.037]) add(wheel.clone(), mat('#1d2320'), 0, 0.0065, z);
  return t;
}

export function buildPlant(kit: PlantKit) {
  const { track, mat, merge, windowMat, rnd } = kit;
  const root = new THREE.Group();
  const M = {
    pad: mat('#cdb98f', { roughness: 1 }), gravel: mat('#cfc3aa', { roughness: 1 }), asphalt: mat('#8b877e', { roughness: 1 }),
    road: mat('#6f6c65', { roughness: 1 }), lawn: mat('#6f9b4b', { roughness: 0.95 }), water: mat('#3c6a62', { roughness: 0.12, metalness: 0.15 }),
    tan: mat('#c6b791'), tanDark: mat('#a99b78'), roofGrey: mat('#a8aeae', { roughness: 0.55, metalness: 0.25 }), roofWhite: mat('#eeede8'),
    steel: mat('#b8bdba', { metalness: 0.35, roughness: 0.5 }), steelDark: mat('#7b8380', { metalness: 0.4, roughness: 0.5 }),
    casing: mat('#d9dad5'), stack: mat('#e2e0d8'), white: mat('#f2f0ea'), fan: mat('#3d4442', { roughness: 0.6 }),
    chips: track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })),
  };
  const Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);

  function put(geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, ry = 0, parent: THREE.Object3D = root) {
    const o = new THREE.Mesh(track(geo), m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = o.receiveShadow = true; parent.add(o); return o;
  }
  /** building-like box standing on y0 */
  const box = (x: number, z: number, w: number, h: number, d: number, m: THREE.Material, ry = 0, parent: THREE.Object3D = root, y0 = TOP) =>
    put(new RoundedBoxGeometry(w, h, d, 1, Math.min(w, h, d) * 0.06), m, x, y0 + h / 2, z, ry, parent);
  /** a straight member between two points (duct, gallery, brace) */
  function beam(a: THREE.Vector3, b: THREE.Vector3, w: number, h: number, m: THREE.Material, parent: THREE.Object3D = root) {
    const d = b.clone().sub(a), o = new THREE.Mesh(track(new THREE.BoxGeometry(w, h, d.length())), m);
    o.position.copy(a).lerp(b, 0.5); o.quaternion.setFromUnitVectors(Z, d.normalize()); o.castShadow = o.receiveShadow = true; parent.add(o); return o;
  }
  /** an elevated conveyor gallery on legs */
  function conveyor(a: THREE.Vector3, b: THREE.Vector3, parent: THREE.Object3D = root) {
    beam(a, b, 0.009, 0.006, M.steelDark, parent);
    const n = Math.floor(a.distanceTo(b) / 0.05);
    for (let i = 1; i < n; i++) { const p = a.clone().lerp(b, i / n); if (p.y - TOP > 0.008) beam(V(p.x, TOP, p.z), V(p.x, p.y - 0.003, p.z), 0.0022, 0.0022, M.steel, parent); }
  }
  /** a flat patch (lawn, water, asphalt) from aerial-pixel corners */
  function patch(pts: [number, number][], m: THREE.Material, lift = 0.0012) {
    const s = new THREE.Shape(pts.map(([px, py]) => { const p = A(px, py); return new THREE.Vector2(p.x, -p.z); }));
    const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2);
    const o = put(g, m, 0, TOP + lift, 0); o.castShadow = false; return o;
  }
  /** a road along an aerial-pixel polyline */
  function road(pts: [number, number][], w: number, m = M.road) {
    for (let i = 1; i < pts.length; i++) {
      const a = A(...pts[i - 1], TOP + 0.0008), b = A(...pts[i], TOP + 0.0008);
      beam(a, b, w, 0.0012, m).castShadow = false;
      const j = put(new THREE.CylinderGeometry(w / 2, w / 2, 0.0012, 12), m, b.x, b.y, b.z); j.castShadow = false;
    }
  }

  /* ---------- ground: fields, the gravel site, lawn, parking, roads, ponds ---------- */
  put(new THREE.BoxGeometry(PAD.w, 0.03, PAD.d), M.pad, 0, TOP - 0.015, 0).castShadow = false;
  patch([[110, 22], [640, 22], [905, 135], [905, 700], [110, 700]], M.gravel, 0.0004);
  patch([[128, 24], [182, 24], [238, 190], [244, 240], [196, 246], [150, 150]], M.lawn);
  patch([[210, 172], [262, 166], [268, 204], [226, 210]], M.lawn);
  road([[0, 10], [640, 12], [760, 44], [860, 92], [926, 122]], 0.016);         // Industry Rd
  road([[480, 716], [926, 712]], 0.014);                                        // Bettendorf Way
  road([[240, 12], [250, 92], [300, 104], [360, 140], [445, 96]], 0.013);      // entrance and truck dumpers
  road([[445, 96], [520, 92], [560, 180], [600, 300], [650, 420], [720, 560], [775, 650], [770, 692], [700, 702], [560, 692], [430, 652], [380, 590], [364, 470], [380, 340], [410, 250], [445, 96]], 0.011);
  for (const pond of [[[158, 578], [200, 578], [200, 682], [158, 682]], [[208, 578], [280, 578], [280, 682], [208, 682]], [[665, 50], [760, 40], [850, 100], [858, 186], [805, 186], [700, 112]]] as [number, number][][]) {
    patch(pond, M.water, 0.0016);
  }

  /* ---------- trees along the edges and around the ponds ---------- */
  {
    const spots: THREE.Vector3[] = [];
    for (let py = 30; py < 700; py += 13) spots.push(A(112 + rnd() * 18, py + rnd() * 6));            // west belt
    for (let px = 120; px < 900; px += 14) spots.push(A(px + rnd() * 6, 704 + rnd() * 14));             // south belt
    for (let px = 560; px < 920; px += 16) spots.push(A(px, 30 + (px - 560) * 0.28 + rnd() * 8));       // along Industry Rd
    for (let py = 150; py < 700; py += 18) spots.push(A(910 + rnd() * 10, py));                          // east edge
    for (let i = 0; i < 40; i++) spots.push(A(300 + rnd() * 110, 595 + rnd() * 95));                      // woodland by the ponds
    for (let i = 0; i < 12; i++) spots.push(A(140 + rnd() * 60, 60 + rnd() * 170));                      // lawn trees
    spots.splice(0, spots.length, ...spots.filter((_, i) => i % 5 !== 2)); // thinned by a fifth
    const mesh = new THREE.InstancedMesh(track(new THREE.IcosahedronGeometry(1, 1)), track(new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true })), spots.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), tints = ['#4a6a3a', '#56753f', '#3f5d35', '#5f7c46'].map((c) => new THREE.Color(c));
    spots.forEach((p, i) => {
      const r = 0.008 + rnd() * 0.005; s.set(r, r * 1.05, r);
      m4.compose(V(p.x, TOP + r * 0.9, p.z), q, s); mesh.setMatrixAt(i, m4); mesh.setColorAt(i, tints[i % tints.length]);
    });
    mesh.castShadow = mesh.receiveShadow = true; root.add(mesh);
  }

  /* ---------- easter egg: wild turkeys on the entrance lawn, as you sometimes see them driving in ---------- */
  const turkeys: { head: THREE.Group; phase: number }[] = [];
  {
    const feather = mat('#3d3027', { roughness: 0.6, metalness: 0.15 }), hen = mat('#6e5a44', { roughness: 0.8 }), tip = mat('#cdbd9f', { roughness: 0.9 });
    const skin = mat('#b9c6d6', { roughness: 0.7 }), wattle = mat('#c23a2e', { roughness: 0.6 }), leg = mat('#c98c5c', { roughness: 0.8 });
    const flock: [number, number, number, boolean][] = [[184, 72, 2.6, true], [198, 92, 0.4, false], [176, 110, -2.2, false], [206, 126, 1.2, true], [190, 146, 2.9, false]];
    for (const [px, py, ry, tom] of flock) {
      const t = new THREE.Group(), k = tom ? 1 : 0.85, p = A(px, py);
      t.position.set(p.x, TOP, p.z); t.rotation.y = ry; t.scale.setScalar(k); root.add(t);
      put(new THREE.SphereGeometry(1, 12, 8).scale(0.0045, 0.004, 0.006), tom ? feather : hen, 0, 0.0075, 0, 0, t);
      for (const x of [-0.0016, 0.0016]) put(new THREE.CylinderGeometry(0.00035, 0.00035, 0.0045, 5), leg, x, 0.0024, 0, 0, t);
      if (tom) {
        // fanned tail: a pale-tipped half disc standing up behind the body
        const fan = put(new THREE.CircleGeometry(0.0078, 14, 0, Math.PI), tip, 0, 0.0085, -0.0052, 0, t); fan.rotation.x = -0.25;
        const inner = put(new THREE.CircleGeometry(0.0068, 14, 0, Math.PI), feather, 0, 0.0086, -0.0049, 0, t); inner.rotation.x = -0.25;
        for (const m of [fan, inner]) (m.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      }
      const head = new THREE.Group(); head.position.set(0, 0.0095, 0.0042); t.add(head); // pivots at the base of the neck to peck
      put(new THREE.CylinderGeometry(0.0007, 0.001, 0.0045, 6), skin, 0, 0.0022, 0.0006, 0, head).rotation.x = 0.25;
      put(new THREE.SphereGeometry(0.0012, 8, 6), skin, 0, 0.0047, 0.0014, 0, head);
      put(new THREE.ConeGeometry(0.0004, 0.0014, 5).rotateX(Math.PI / 2), leg, 0, 0.0047, 0.0029, 0, head);
      if (tom) put(new THREE.SphereGeometry(0.0006, 6, 5), wattle, 0, 0.0034, 0.0022, 0, head);
      turkeys.push({ head, phase: px * 0.37 });
    }
  }

  /* ---------- a chip truck out on the yard loop ---------- */
  { const t = makeTruck(kit, '#46566b'); t.scale.setScalar(0.8); t.position.copy(A(738, 548)); t.rotation.y = 0.46; root.add(t); }

  /* ---------- truck tippers: a truck drives north onto the deck, the deck lifts its nose, and the chips slide out
     the back doors into a grated pit at the head of the chip piles; a conveyor from the pit feeds the yard ---------- */
  // trucks face just west of north (the road's heading turned 30° counterclockwise), so the pits face the piles
  const DUMP = A(458, 222, TOP + 0.004); // the tipper our truck uses
  const dir = A(418, 222).sub(A(405, 298)).setY(0).normalize().applyAxisAngle(Y, THREE.MathUtils.degToRad(30));
  const APPROACH = DUMP.clone().addScaledVector(dir, -0.07).setY(TOP), yaw = Math.atan2(dir.x, dir.z), side = V(dir.z, 0, -dir.x);
  const tippers = [0, 1].map((n) => {
    // the second tipper sits alongside to the west (a little further off), staggered north to clear the turbine hall
    const hinge = DUMP.clone().setY(TOP).addScaledVector(dir, -0.055 + n * 0.03).addScaledVector(side, n * 0.058).add(V(-20 * K * n, 0, 0));
    const base = new THREE.Group(); base.position.copy(hinge); base.rotation.y = yaw; root.add(base);
    put(new THREE.BoxGeometry(0.046, 0.0015, 0.028), M.fan, 0, 0.001, -0.012, 0, base).castShadow = false;       // grated pit
    for (const x of [-0.027, 0.027]) box(x, 0.058, 0.005, 0.009, 0.126, M.tanDark, 0, base, 0);                    // low side walls
    const tilt = new THREE.Group(); tilt.position.y = 0.004; base.add(tilt);
    put(new THREE.BoxGeometry(0.042, 0.004, 0.125), M.steelDark, 0, 0, 0.0625, 0, tilt);
    for (const x of [-0.02, 0.02]) put(new THREE.BoxGeometry(0.003, 0.007, 0.125), M.steel, x, 0.004, 0.0625, 0, tilt);
    const ram = put(new THREE.CylinderGeometry(0.0028, 0.0028, 1, 8), M.steel, 0, 0, 0, 0, base), foot = V(0, 0, 0.078);
    const setTilt = (a: number) => {
      tilt.rotation.x = -a; // nose up, pivoting on the hinge over the pit
      const top = V(0, 0.002 + Math.sin(a) * 0.06, Math.cos(a) * 0.06); // under the deck's front half
      ram.position.copy(foot).lerp(top, 0.5); ram.scale.set(1, Math.max(0.001, top.distanceTo(foot)), 1);
      ram.quaternion.setFromUnitVectors(Y, top.clone().sub(foot).normalize().add(V(0, 1e-6, 0)).normalize());
      ram.visible = a > 0.02;
    };
    setTilt(0);
    return { base, tilt, setTilt, truckAt: V(0, 0.002, 0.055), rear: V(0, 0.024, 0.006), pit: V(0, -0.002, -0.012) };
  });
  { const t = makeTruck(kit, '#7a3f35'); t.position.copy(tippers[1].truckAt); tippers[1].tilt.add(t); }
  const PIT_OUT = DUMP.clone().setY(0.012).addScaledVector(dir, -0.075);
  const YARD_HEAD = A(466, 322, 0.05); // just past the tipper pits
  conveyor(PIT_OUT, YARD_HEAD);
  box(YARD_HEAD.x, YARD_HEAD.z, 0.018, 0.058, 0.018, M.tanDark); // transfer tower

  /* ---------- fuel yard: two chip ridges, twin conveyors, a stacker, and the log decks ---------- */
  function ridge(a: THREE.Vector3, b: THREE.Vector3, hw: number, H: number, seed: number) {
    const L = a.distanceTo(b), g = new THREE.PlaneGeometry(L + 2 * hw, 2 * hw, 72, 22); g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(pos.count * 3), c = new THREE.Color(), lo = new THREE.Color('#8c6a49'), hi = new THREE.Color('#b99169');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const t = THREE.MathUtils.smoothstep(1 - Math.abs(z) / hw, 0, 1), e = THREE.MathUtils.smoothstep((L / 2 + hw - Math.abs(x)) / hw, 0, 1);
      const bump = 1 + 0.07 * Math.sin(x * 23 + seed) * Math.cos(z * 41 + seed) + 0.04 * Math.sin(x * 97 + z * 60 + seed * 3);
      const h = H * Math.pow(t * e, 0.8) * bump;
      pos.setY(i, h - 0.003);
      c.copy(lo).lerp(hi, THREE.MathUtils.clamp(h / H + Math.sin(x * 160 + z * 40) * 0.15, 0, 1)); col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    const d = b.clone().sub(a), o = put(g, M.chips, (a.x + b.x) / 2, TOP, (a.z + b.z) / 2, Math.atan2(-d.z, d.x));
    return o;
  }
  ridge(A(402, 330), A(548, 690), 0.042, 0.062, 1);
  ridge(A(526, 344), A(678, 650), 0.056, 0.07, 4);
  conveyor(A(456, 322, 0.05), A(590, 672, 0.05));
  conveyor(A(477, 322, 0.05), A(611, 672, 0.05));
  const STACKER = A(520, 470);
  box(STACKER.x, STACKER.z, 0.014, 0.06, 0.014, M.steel);
  beam(V(STACKER.x, 0.06, STACKER.z), A(582, 452, 0.085), 0.008, 0.006, M.steelDark);
  {
    // log decks: diagonal rows of logs east of the yard
    const rows: [number, number, number][] = [];
    for (let i = 0; i < 14; i++) { const y = 175 + i * 20.5; rows.push([628 + i * 6, y, 100 + (i % 4) * 22 + (i > 9 ? -30 : 0)]); }
    const logs = new THREE.InstancedMesh(track(new THREE.CylinderGeometry(1, 1, 1, 7).rotateZ(Math.PI / 2)), track(new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true })), rows.length * 2);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), tints = ['#a8916f', '#9a8262', '#b6a07c'].map((c) => new THREE.Color(c));
    let n = 0;
    for (const [px, py, len] of rows) {
      // each row is split by a gap, as in the aerial
      for (const [f0, f1] of [[0, 0.55], [0.62, 1]]) {
        const a = A(px + len * f0, py - len * f0 * 0.27), b = A(px + len * f1, py - len * f1 * 0.27), d = b.clone().sub(a);
        q.setFromAxisAngle(Y, Math.atan2(-d.z, d.x)); s.set(d.length(), 0.007, 0.008);
        m4.compose(V((a.x + b.x) / 2, TOP + 0.004, (a.z + b.z) / 2), q, s); logs.setMatrixAt(n, m4); logs.setColorAt(n, tints[n % 3]); n++;
      }
    }
    logs.castShadow = logs.receiveShadow = true; root.add(logs);
  }

  /* ---------- the power block: three boiler units in a row beside the turbine hall ---------- */
  const blk = new THREE.Group(); blk.position.copy(A(288, 378, 0)); blk.rotation.y = Math.atan(0.5); root.add(blk);
  // turbine hall: long tan building with a grey roof, windows along both long walls
  box(0, -0.05, 0.17, 0.07, 0.044, M.tan, 0, blk);
  put(new THREE.BoxGeometry(0.174, 0.004, 0.048), M.roofGrey, 0, TOP + 0.072, -0.05, 0, blk);
  for (const z of [-0.0725, -0.0275]) for (let i = 0; i < 7; i++) put(new THREE.BoxGeometry(0.013, 0.012, 0.001), windowMat, -0.072 + i * 0.024, TOP + 0.045, z, 0, blk);
  // long white-roofed building to the west, and the air-cooled condenser banks
  box(-0.105, -0.01, 0.032, 0.04, 0.095, M.tan, 0, blk); put(new THREE.BoxGeometry(0.034, 0.003, 0.097), M.roofWhite, -0.105, TOP + 0.041, -0.01, 0, blk);
  for (const [x, z] of [[-0.16, 0.06], [-0.095, 0.09]]) {
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) beam(V(x + dx * 0.02, TOP, z + dz * 0.028), V(x + dx * 0.02, TOP + 0.022, z + dz * 0.028), 0.003, 0.003, M.steel, blk);
    box(x, z, 0.046, 0.012, 0.062, M.steel, 0, blk, TOP + 0.022);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) put(new THREE.CylinderGeometry(0.0085, 0.0085, 0.002, 14), M.fan, x - 0.011 + i * 0.022, TOP + 0.035, z - 0.019 + j * 0.019, 0, blk);
  }
  // one open steel boiler frame, shared by the three units
  const FW = 0.038, FD = 0.032, FH = 0.165;
  const frameGeo = (() => {
    const parts: THREE.BufferGeometry[] = [], at = (g: THREE.BufferGeometry, x: number, y: number, z: number) => { g.translate(x, y, z); parts.push(g); };
    for (const x of [-FW / 2, 0, FW / 2]) for (const z of [-FD / 2, FD / 2]) at(new THREE.BoxGeometry(0.0022, FH, 0.0022), x, FH / 2, z);
    for (const y of [0.035, 0.07, 0.105, 0.14, FH]) {
      for (const z of [-FD / 2, FD / 2]) at(new THREE.BoxGeometry(FW, 0.0018, 0.0018), 0, y, z);
      for (const x of [-FW / 2, FW / 2]) at(new THREE.BoxGeometry(0.0018, 0.0018, FD), x, y, 0);
      at(new THREE.BoxGeometry(FW * 0.96, 0.0009, FD * 0.35), 0, y, FD * 0.3); // grating walkway
    }
    for (const z of [-FD / 2, FD / 2]) for (const [y0, y1, s] of [[0, 0.035, 1], [0.035, 0.07, -1], [0.07, 0.105, 1], [0.105, 0.14, -1]]) {
      const g = new THREE.BoxGeometry(0.0012, Math.hypot(FW / 2, y1 - y0), 0.0012); g.rotateZ(s * Math.atan2(FW / 2, y1 - y0)); at(g, s * FW / 4, (y0 + y1) / 2, z);
    }
    return track(merge(parts));
  })();
  const units = [-0.058, 0, 0.058], stackTops: THREE.Vector3[] = [];
  for (const x of units) {
    put(frameGeo.clone(), M.steel, x, TOP, 0.004, 0, blk);
    box(x, 0.004, FW * 0.66, 0.13, FD * 0.62, M.casing, 0, blk, TOP + 0.012);           // boiler casing inside the frame
    const drum = put(new THREE.CylinderGeometry(0.0055, 0.0055, FW * 0.8, 14), M.steel, x, TOP + FH + 0.006, 0.0, 0, blk); drum.rotation.z = Math.PI / 2;
    put(new THREE.CylinderGeometry(0.002, 0.002, 0.02, 8), M.steelDark, x + 0.01, TOP + FH + 0.012, 0.008, 0, blk);
    for (const y of [0.06, 0.13]) put(new THREE.BoxGeometry(0.0025, 0.0025, 0.0025), windowMat, x + FW / 2, TOP + y, 0.004 + FD / 2, 0, blk);
    // baghouse on hoppers, ducted from the boiler
    box(x - 0.004, 0.05, 0.032, 0.078, 0.026, M.tan, 0, blk, TOP + 0.03);
    for (const dx of [-0.008, 0.008]) put(new THREE.ConeGeometry(0.011, 0.018, 4).rotateY(Math.PI / 4).rotateX(Math.PI), M.tanDark, x - 0.004 + dx, TOP + 0.021, 0.05, 0, blk);
    for (const [dx, dz] of [[-0.014, -0.011], [0.014, -0.011], [-0.014, 0.011], [0.014, 0.011]]) beam(V(x - 0.004 + dx, TOP, 0.05 + dz), V(x - 0.004 + dx, TOP + 0.03, 0.05 + dz), 0.002, 0.002, M.steel, blk);
    beam(V(x, TOP + 0.1, 0.018), V(x - 0.004, TOP + 0.1, 0.038), 0.012, 0.012, M.tanDark, blk);
    beam(V(x - 0.02, TOP + 0.085, 0.058), V(x - 0.02, TOP + 0.03, 0.09), 0.003, 0.003, M.steel, blk); // stair
    // stack with a platform ring near the top
    const sx = x - 0.016, sz = 0.078;
    put(new THREE.CylinderGeometry(0.0056, 0.0072, 0.3, 18), M.stack, sx, TOP + 0.15, sz, 0, blk);
    put(new THREE.CylinderGeometry(0.0058, 0.0058, 0.006, 18), M.steelDark, sx, TOP + 0.297, sz, 0, blk);
    put(new THREE.CylinderGeometry(0.0125, 0.0125, 0.0025, 20), M.steelDark, sx, TOP + 0.255, sz, 0, blk);
    const rail = put(new THREE.CylinderGeometry(0.0125, 0.0125, 0.006, 20, 1, true), track(new THREE.MeshStandardMaterial({ color: '#8f9794', side: THREE.DoubleSide, metalness: 0.4 })), sx, TOP + 0.26, sz, 0, blk); rail.castShadow = false;
    box(sx + 0.008, sz, 0.007, 0.012, 0.007, M.steel, 0, blk, TOP + 0.256);
    beam(V(x - 0.006, TOP + 0.07, 0.062), V(sx, TOP + 0.07, sz), 0.009, 0.009, M.tanDark, blk);
    // white cyclone silo on legs, piped to the baghouse
    const cx = x + 0.012, cz = 0.08;
    put(new THREE.CylinderGeometry(0.0085, 0.0085, 0.04, 18), M.white, cx, TOP + 0.057, cz, 0, blk);
    put(new THREE.ConeGeometry(0.0085, 0.016, 18).rotateX(Math.PI), M.white, cx, TOP + 0.029, cz, 0, blk);
    for (const [dx, dz] of [[-0.007, -0.007], [0.007, -0.007], [-0.007, 0.007], [0.007, 0.007]]) beam(V(cx + dx, TOP, cz + dz), V(cx + dx, TOP + 0.037, cz + dz), 0.0018, 0.0018, M.steel, blk);
    beam(V(cx, TOP + 0.077, cz), V(x + 0.004, TOP + 0.1, 0.06), 0.004, 0.004, M.steel, blk);
    stackTops.push(V(sx, TOP + 0.3, sz));
  }
  // fuel conveyor climbs from the yard transfer tower to a feed gallery along the top of the boilers
  const FEED0 = V(0.09, TOP + 0.125, 0.004), FEED1 = V(-0.075, TOP + 0.125, 0.004);
  beam(FEED0, FEED1, 0.009, 0.007, M.steelDark, blk);
  // steam pipe from the boiler row to the turbine hall
  const steamPts = [V(0.03, TOP + 0.15, -0.006), V(0.03, TOP + 0.12, -0.02), V(0.02, TOP + 0.09, -0.032), V(0.0, TOP + 0.06, -0.036)];
  put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(steamPts), 24, 0.0035, 8), mat('#b9c3c8', { metalness: 0.4, roughness: 0.4 }), 0, 0, 0, 0, blk);
  // substation south of the power block
  const SUBX = -0.02, SUBZ = 0.16;
  {
    put(new THREE.BoxGeometry(0.07, 0.0015, 0.05), M.gravel, SUBX, TOP + 0.001, SUBZ, 0, blk).castShadow = false;
    for (const dx of [-0.018, 0.004]) box(SUBX + dx, SUBZ + 0.012, 0.012, 0.012, 0.01, M.tanDark, 0, blk);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) beam(V(SUBX - 0.03 + i * 0.02, TOP, SUBZ - 0.016 + j * 0.02), V(SUBX - 0.03 + i * 0.02, TOP + 0.04, SUBZ - 0.016 + j * 0.02), 0.0018, 0.0018, M.steel, blk);
    for (const j of [0, 1]) beam(V(SUBX - 0.032, TOP + 0.04, SUBZ - 0.016 + j * 0.02), V(SUBX + 0.032, TOP + 0.04, SUBZ - 0.016 + j * 0.02), 0.002, 0.002, M.steel, blk);
  }

  blk.updateMatrix();
  const B = (p: THREE.Vector3) => p.clone().applyMatrix4(blk.matrix); // block-local → plant-local
  const feed0 = B(FEED0);
  conveyor(YARD_HEAD.clone().setY(0.052), feed0);
  box(feed0.x, feed0.z, 0.014, 0.13, 0.014, M.steelDark);

  return {
    group: root,
    /** [0] takes the truck we follow; [1] cycles on its own. Poses in tipper-local space: truckAt on the deck, rear doors, pit. */
    tippers,
    turkeys,
    /** plant-local anchors for the story */
    at: {
      // in off Industry Rd, a clockwise lap of the fuel yard, then north onto the tipper
      entry: ([[240, -70], [242, 12], [250, 92], [300, 104], [360, 140], [445, 96], [520, 92], [560, 180], [600, 300], [650, 420], [720, 560], [775, 650], [770, 692],
        [700, 702], [560, 692], [430, 652], [380, 590], [364, 470], [382, 360]] as [number, number][]).map(([x, y]) => A(x, y)).concat([APPROACH, DUMP]),
      yard: A(560, 470, 0.03), yardLabel: A(530, 420, 0.1),
      boiler: B(V(0, TOP + 0.1, 0.004)), boilerLabel: B(V(0.02, TOP + 0.2, 0.004)),
      stack: stackTops[1], stackTops, srm: B(V(0, TOP + 0.34, 0.05)),
      turbine: B(V(0, TOP + 0.05, -0.05)), turbineLabel: B(V(0.05, TOP + 0.1, -0.05)),
      sub: B(V(SUBX, TOP + 0.04, SUBZ)), subLabel: B(V(SUBX, TOP + 0.075, SUBZ)),
      fuel: [DUMP.clone().setY(0.012).addScaledVector(dir, -0.06), PIT_OUT.clone().setY(0.018), YARD_HEAD.clone().setY(0.058), feed0.clone().setY(feed0.y + 0.006), B(V(0, TOP + 0.15, 0.004))],
      steam: steamPts.map(B),
      power: [B(V(-0.06, TOP + 0.05, -0.03)), B(V(-0.05, TOP + 0.045, 0.1)), B(V(SUBX, TOP + 0.045, SUBZ))],
    },
  };
}
