import type { SunState } from '../../lib/sun';

/** A story engine draws the forest-to-power journey. The shell owns scroll, copy, and controls. */
export interface StoryEngine {
  resize(width: number, height: number): void;
  setLight(state: SunState): void;
  /** sf: continuous story position (-1 = hero … 7.999 = last step); step: the step whose copy is showing. */
  frame(dt: number, sf: number, step: number): void;
  dispose(): void;
}

export interface EngineContext {
  stage: HTMLElement;
  canvas: HTMLCanvasElement;
  labels: HTMLElement;
  mobile: boolean;
  reduce: boolean;
  /** Screen areas (stage coordinates) that labels must stay clear of: the hero copy and the caption card. */
  avoid: () => DOMRect[];
}

export type EngineName = 'diorama' | 'contour';

// Real-world anchor points, as fractions of the terrain grid (u → east, v → south).
export const PLACES: Record<string, [number, number]> = {
  'Mt. Shasta': [0.4881, 0.1165], 'Lassen Peak': [0.9065, 0.7397], Anderson: [0.4258, 0.7665],
  Redding: [0.3688, 0.6736], 'Red Bluff': [0.4633, 0.9473], 'Shasta Lake': [0.4062, 0.5432],
  Burney: [0.812, 0.474], Weaverville: [0.0352, 0.5762], Cottonwood: [0.4361, 0.8085],
};

export async function loadHeights() {
  const j = await fetch('/data/heights.json').then((r) => { if (!r.ok) throw new Error(`terrain data ${r.status}`); return r.json(); });
  const bytes = Uint8Array.from(atob(j.le16), (c) => c.charCodeAt(0));
  return { hm: new Uint16Array(bytes.buffer), gw: j.gw as number, gh: j.gh as number };
}

/** Real city limits (Census TIGER), in the same grid space as PLACES. rings: flat [u,v,…] outer rings and holes. */
export type Town = { name: string; kind: 'city' | 'cdp'; km2: number; center: [number, number]; rings: number[][] };

export async function loadTowns(): Promise<Town[]> {
  const j = await fetch('/data/towns.json').then((r) => { if (!r.ok) throw new Error(`town data ${r.status}`); return r.json(); });
  return j.towns;
}

/** Even-odd point-in-polygon across every ring, so holes (county islands) stay outside. */
export function inRings(rings: number[][], u: number, v: number) {
  let inside = false;
  for (const r of rings) {
    for (let i = 0, n = r.length / 2, j = n - 1; i < n; j = i++) {
      const xi = r[i * 2], yi = r[i * 2 + 1], xj = r[j * 2], yj = r[j * 2 + 1];
      if (yi > v !== yj > v && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

export const hits =(rects: DOMRect[], x: number, y: number, w: number, h: number) =>
  rects.some((r) => x < r.right && x + w > r.left && y < r.bottom && y + h > r.top);

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export function seeded(seed = 5) { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }
