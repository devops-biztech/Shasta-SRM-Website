import { getCollection, type CollectionEntry } from 'astro:content';

export type Job = CollectionEntry<'jobs'>;

export async function openJobs() {
  return (await getCollection('jobs', (j) => j.data.open)).sort((a, b) => a.data.order - b.data.order);
}

const money = (n: number) => `$${n.toFixed(2)}`;
export function payRange(job: Job) {
  const w = job.data.levels.map((l) => l.wage);
  const lo = Math.min(...w), hi = Math.max(...w);
  return lo === hi ? `${money(lo)}/hr` : `${money(lo)}–${money(hi)}/hr`;
}
