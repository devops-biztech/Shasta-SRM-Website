// Low-precision solar position for Anderson, CA. Good to a fraction of a degree,
// which is plenty for lighting a sky and a model.

const RAD = Math.PI / 180;
export const ANDERSON = { lat: 40.448, lon: -122.297 };

export type SunState = { alt: number; az: number; night: boolean; warm: number; mode: LightMode };
export type LightMode = 'live' | 'day' | 'golden' | 'night';

export function sunPosition(date: Date, lat = ANDERSON.lat, lon = ANDERSON.lon) {
  const d = date.getTime() / 86400000 + 2440587.5 - 2451545;
  const g = (357.529 + 0.98560028 * d) * RAD;
  const q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const e = (23.439 - 0.00000036 * d) * RAD;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = (18.697374558 + 24.06570982441908 * d) % 24;
  const H = (gmst * 15 + lon) * RAD - ra;
  const la = lat * RAD;
  const alt = Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(la) - Math.tan(dec) * Math.cos(la)) + Math.PI;
  return { alt: alt / RAD, az: az / RAD };
}

const PRESETS: Record<Exclude<LightMode, 'live'>, { alt: number; az: number }> = {
  day: { alt: 48, az: 195 },
  golden: { alt: 5, az: 258 },
  night: { alt: -30, az: 330 },
};

export function lightState(mode: LightMode, now = new Date()): SunState {
  const { alt, az } = mode === 'live' ? sunPosition(now) : PRESETS[mode];
  return { alt, az, night: alt < -0.833, warm: Math.max(0, Math.min(1, 1 - (alt - 2) / 25)), mode };
}

/** Next sunrise or sunset after `now`, searched in 2-minute steps. */
export function nextSunEvent(now = new Date()) {
  const up = sunPosition(now).alt > -0.833;
  for (let m = 2; m < 1500; m += 2) {
    const t = new Date(now.getTime() + m * 60000);
    if ((sunPosition(t).alt > -0.833) !== up) return { kind: up ? 'sets' : 'rises', at: t } as const;
  }
  return null;
}

export const fmtTime = (d: Date) =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit' })
    .format(d).replace('AM', 'a.m.').replace('PM', 'p.m.');

/** Light mode chosen by the visitor for this session (preview), else live. */
export function currentMode(): LightMode {
  try {
    const q = new URLSearchParams(location.search).get('light');
    if (q === 'day' || q === 'golden' || q === 'night' || q === 'live') { sessionStorage.setItem('srm-light', q); return q; }
    const s = sessionStorage.getItem('srm-light');
    if (s === 'day' || s === 'golden' || s === 'night') return s;
  } catch { /* storage can be unavailable */ }
  return 'live';
}

export function setMode(mode: LightMode) {
  try { sessionStorage.setItem('srm-light', mode); } catch { /* ignore */ }
  const s = lightState(mode);
  document.documentElement.classList.toggle('night', s.night);
  window.dispatchEvent(new CustomEvent('srm:light', { detail: s }));
  return s;
}
