// The journey shell: scroll → story position, copy, controls, light. The engine only draws.
import { steps, flowColor } from '../data/story';
import { lightState, currentMode, setMode, nextSunEvent, fmtTime, type LightMode, type SunState } from '../lib/sun';
import type { EngineName, StoryEngine } from './engines/types';
import { clamp, ease } from './engines/types';

const HERO_END = 0.05;
const STEP = (1 - HERO_END - 0.04) / 8;

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

function chosenEngine(fallback: EngineName): EngineName {
  let name = fallback;
  try {
    const q = new URLSearchParams(location.search).get('view');
    if (q === 'diorama' || q === 'contour') { sessionStorage.setItem('srm-view', q); name = q; }
    else { const s = sessionStorage.getItem('srm-view'); if (s === 'diorama' || s === 'contour') name = s; }
  } catch { /* storage unavailable */ }
  return name;
}

export function mountJourney(root: HTMLElement) {
  const $ = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const stage = $('[data-stage]'), host = $('[data-engine-host]'), labels = $('[data-labels]');
  const loading = $('[data-loading]'), hero = $('[data-hero]'), panel = $('[data-panel]'), cue = root.querySelector<HTMLElement>('[data-cue]');
  const titleEl = $('[data-title]'), textEl = $('[data-text]'), figureEl = $('[data-figure]'), countEl = $('[data-count]');
  const rail = [...root.querySelectorAll<HTMLButtonElement>('[data-jump]')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = () => innerWidth < 860;

  let engine: StoryEngine | null = null, engineName: EngineName | null = null, mounting = 0;
  let light: SunState = lightState(currentMode());

  /* ---------- scroll → story position ---------- */
  const progress = () => clamp(-root.getBoundingClientRect().top / (root.offsetHeight - innerHeight), 0, 1);
  const sfOf = (p: number) => (p < HERO_END ? -1 + p / HERO_END : Math.min(7.999, (p - HERO_END) / STEP));
  const jumpTo = (i: number) => {
    const p = HERO_END + (i + 0.3) * STEP;
    scrollTo({ top: root.offsetTop + p * (root.offsetHeight - innerHeight), behavior: reduce ? 'auto' : 'smooth' });
  };
  root.querySelector('[data-start]')?.addEventListener('click', (e) => { if (root.classList.contains('static')) return; e.preventDefault(); jumpTo(0); });
  rail.forEach((b) => b.addEventListener('click', () => jumpTo(Number(b.dataset.jump))));

  /* ---------- copy ---------- */
  let shown = -2;
  function setStep(i: number) {
    if (i === shown) return;
    const first = shown === -2; shown = i;
    root.classList.toggle('stepping', i >= 0);
    panel.classList.toggle('on', i >= 0);
    rail.forEach((b, j) => { b.classList.toggle('done', j < i); b.classList.toggle('now', j === i); b.tabIndex = i >= 0 ? 0 : -1; });
    panel.setAttribute('aria-hidden', String(i < 0));
    if (i < 0) return;
    titleEl.textContent = steps[i].title; textEl.textContent = steps[i].text; countEl.textContent = `${i + 1}/8`;
    if (!first && !reduce) for (const el of [titleEl, textEl]) { el.classList.remove('enter'); void (el as HTMLElement).offsetWidth; el.classList.add('enter'); }
  }
  function setFigure(step: number, sf: number) {
    let html = '';
    if (step === 3) html = '1,250 tons<small>of wood a day</small>';
    else if (step === 5) html = '55 MW<small>generating capacity</small>';
    else if (step === 7) html = `${Math.round(62600 * ease(clamp((sf - 7.45) / 0.45, 0, 1))).toLocaleString('en-US')}<small>homes powered</small>`;
    figureEl.hidden = !html;
    if (html && figureEl.innerHTML !== html) figureEl.innerHTML = html;
  }

  /* ---------- light ---------- */
  const sub = $('[data-sub]'), now = $('[data-now]');
  function paintLight() {
    const s = light;
    stage.style.setProperty('--sky-top', skyColor(s.alt, 0)); stage.style.setProperty('--sky-bot', skyColor(s.alt, 1));
    sub.innerHTML = s.night
      ? 'The sun is down and solar is resting. Our plant is still turning forest waste into power for about <b>62,600 homes</b>.'
      : 'We turn thinnings from the forests around Mt.&nbsp;Shasta and Lassen into renewable electricity for about <b>62,600 homes</b>.';
    if (s.mode === 'live') {
      const ev = nextSunEvent();
      now.textContent = `${fmtTime(new Date())} in Anderson${ev ? ` · sun ${ev.kind} at ${fmtTime(ev.at)}` : ''}`;
    } else now.textContent = `Previewing ${({ day: 'midday', golden: 'golden hour', night: 'night' } as const)[s.mode as Exclude<LightMode, 'live'>]} light`;
    engine?.setLight(s);
    root.querySelectorAll<HTMLButtonElement>('[data-light]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.light === s.mode)));
  }
  root.querySelectorAll<HTMLButtonElement>('[data-light]').forEach((b) => b.addEventListener('click', () => { light = setMode(b.dataset.light as LightMode); paintLight(); }));
  addEventListener('srm:light', (e) => { light = (e as CustomEvent<SunState>).detail; paintLight(); });
  setInterval(() => { if (light.mode === 'live') { light = lightState('live'); document.documentElement.classList.toggle('night', light.night); paintLight(); } }, 60000);

  /* ---------- engines ---------- */
  function fallbackToText(reason: unknown) {
    console.warn('[journey] story engine unavailable:', reason);
    root.classList.add('static');
    loading.classList.add('done');
  }
  async function mount(name: EngineName) {
    const id = ++mounting;
    engine?.dispose(); engine = null;
    host.replaceChildren();
    const canvas = document.createElement('canvas');
    host.appendChild(canvas);
    loading.textContent = name === 'diorama' ? 'Building the model…' : 'Drawing the map…';
    loading.classList.remove('done');
    try {
      const mod = name === 'diorama' ? await import('./engines/diorama') : await import('./engines/contour');
      const create = 'createDiorama' in mod ? mod.createDiorama : mod.createContour;
      const avoid = () => {
        const s = stage.getBoundingClientRect(), out: DOMRect[] = [];
        for (const el of [hero, panel]) {
          if (el === hero ? Number(hero.style.opacity || 1) < 0.1 : !panel.classList.contains('on')) continue;
          const r = el.getBoundingClientRect(); out.push(new DOMRect(r.left - s.left - 12, r.top - s.top - 12, r.width + 24, r.height + 24));
        }
        return out;
      };
      const e = await create({ stage, canvas, labels, mobile: mobile(), reduce, avoid });
      if (id !== mounting) { e.dispose(); return; }
      engine = e; engineName = name;
      const r = stage.getBoundingClientRect(); e.resize(r.width, r.height); e.setLight(light);
      loading.classList.add('done');
      root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === name)));
    } catch (err) {
      if (name === 'diorama') { console.warn('[journey] 3D failed, using the map', err); return mount('contour'); }
      fallbackToText(err);
    }
  }
  root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) => b.addEventListener('click', () => {
    const v = b.dataset.view as EngineName;
    if (v === engineName) return;
    try { sessionStorage.setItem('srm-view', v); } catch { /* ignore */ }
    if (v === 'diorama' && !webglOK()) return;
    mount(v);
  }));
  new ResizeObserver(() => { const r = stage.getBoundingClientRect(); engine?.resize(r.width, r.height); }).observe(stage);

  let visible = true;
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(root);

  let last = performance.now();
  function frame(t: number) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (!visible || root.classList.contains('static')) return;
    const sf = sfOf(progress());
    const step = sf < -0.25 ? -1 : clamp(Math.floor(sf + 0.25), 0, 7);
    setStep(step); setFigure(step, sf);
    const heroA = clamp(1 - (sf + 1) / 0.55, 0, 1);
    hero.style.opacity = String(heroA); hero.style.transform = `translateY(${((1 - heroA) * -16).toFixed(1)}px)`;
    hero.style.visibility = heroA < 0.02 ? 'hidden' : 'visible';
    if (cue) cue.style.opacity = String(heroA);
    engine?.frame(dt, sf, step);
  }

  paintLight();
  const want = chosenEngine((root.dataset.engine as EngineName) || 'diorama');
  mount(want === 'diorama' && !webglOK() ? 'contour' : want);
  requestAnimationFrame(frame);
}

const SKY: [number, string, string][] = [[-90, '#050b17', '#101c33'], [-10, '#0b1630', '#22335a'], [-3, '#2c3a68', '#d0795a'], [3, '#6a8fc0', '#f3b27a'], [12, '#86b5df', '#f0dcc4'], [35, '#78b0e0', '#e4eff5'], [90, '#6aa8e0', '#e0edf5']];
function skyColor(alt: number, which: 0 | 1) {
  let i = 0; while (i < SKY.length - 2 && SKY[i + 1][0] <= alt) i++;
  const t = clamp((alt - SKY[i][0]) / (SKY[i + 1][0] - SKY[i][0]), 0, 1);
  const a = SKY[i][which + 1] as string, b = SKY[i + 1][which + 1] as string;
  const h = (s: string, k: number) => parseInt(s.slice(1 + k * 2, 3 + k * 2), 16);
  return `rgb(${[0, 1, 2].map((k) => Math.round(h(a, k) + (h(b, k) - h(a, k)) * t)).join(',')})`;
}

export { flowColor };
