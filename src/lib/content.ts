import { getCollection } from 'astro:content';
import { buildModel, type BlogModel } from './model.ts';

let cached: Promise<BlogModel> | undefined;
export function getModel(): Promise<BlogModel> {
  // Re-read during development so Markdown edits are reflected immediately.
  if (import.meta.env.DEV) return getCollection('posts').then(buildModel);
  return cached ??= getCollection('posts').then(buildModel);
}
