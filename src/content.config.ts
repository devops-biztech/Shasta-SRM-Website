import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Job postings: one Markdown file per role in src/content/jobs.
// To close a role, set `open: false` (or delete the file).
const jobs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/jobs' }),
  schema: z.object({
    title: z.string(),
    order: z.number().default(50),
    open: z.boolean().default(true),
    summary: z.string(),
    levels: z.array(z.object({ name: z.string(), wage: z.number() })).min(1),
    requirements: z.array(z.string()).default([]),
    schedule: z.string().optional(),
  }),
});

export const collections = { jobs };
