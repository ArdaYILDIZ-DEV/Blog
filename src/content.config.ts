import { defineCollection } from 'astro/content/config';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { withRawDates } from './lib/frontmatter.ts';

const date = z.union([z.date(), z.string().refine(value => {
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return false;
  const day = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === value.slice(0, 10)
    && Number.isFinite(new Date(value).getTime());
}, 'Use a valid ISO date (YYYY-MM-DD) or ISO timestamp').transform(value => new Date(value))]);

const posts = defineCollection({
  loader: withRawDates(glob({
    pattern: '**/*.md',
    base: './content',
    // Keep the original path so the model can report normalization collisions.
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  })),
  schema: ({ image }) => z.object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).optional(),
    date: date.optional(),
    updated: date.optional(),
    tags: z.array(z.string().trim().min(1)).optional(),
    translationKey: z.string().trim().min(1).optional(),
    draft: z.boolean().optional(),
    cover: image().optional(),
  }).strict(),
});

export const collections = { posts };
