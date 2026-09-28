import type { Schedule } from '../data/site';

const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const fmtHour = (h: number) => {
  if (h === 24 || h === 0) return 'midnight';
  if (h === 12) return 'noon';
  const hh = h % 12 || 12;
  return `${hh}:00 ${h < 12 ? 'a.m.' : 'p.m.'}`;
};

/** Current day and fractional hour in Anderson, whatever the visitor's timezone. */
export function andersonNow(now = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false })
      .formatToParts(now).map((x) => [x.type, x.value]),
  );
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { day, hour: (Number(p.hour) % 24) + Number(p.minute) / 60 };
}

export function status(s: Schedule, now = new Date()) {
  const { day, hour } = andersonNow(now);
  const today = s.days[day];
  if (today && hour >= today.open && hour < today.close) {
    return { open: true, text: `Open now`, detail: `until ${fmtHour(today.close)}` };
  }
  // find next opening
  for (let i = 0; i < 8; i++) {
    const d = (day + i) % 7, w = s.days[d];
    if (!w) continue;
    if (i === 0 && hour >= w.open) continue;
    const when = i === 0 ? 'today' : i === 1 ? 'tomorrow' : DAY[d];
    return { open: false, text: 'Closed now', detail: `opens ${when} at ${fmtHour(w.open)}` };
  }
  return { open: false, text: 'Closed', detail: '' };
}

/** Group consecutive days with identical hours: "Mon–Fri 5:00 a.m.–midnight". */
export function summarize(s: Schedule) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const short = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const rows: { days: string; hours: string }[] = [];
  let start = order[0], prev = order[0];
  const key = (d: number) => JSON.stringify(s.days[d]);
  for (let i = 1; i <= order.length; i++) {
    const d = order[i];
    if (i < order.length && key(d) === key(prev)) { prev = d; continue; }
    const w = s.days[prev];
    rows.push({ days: start === prev ? short[start] : `${short[start]}–${short[prev]}`, hours: w ? `${fmtHour(w.open)} – ${fmtHour(w.close)}` : 'Closed' });
    start = prev = d;
  }
  return rows;
}
