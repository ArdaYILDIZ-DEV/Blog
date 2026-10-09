import { isLang, type Lang } from './i18n.ts';
import { slugify } from './urls.ts';

export interface RawPost {
  id: string;
  data: {
    title?: string; description?: string; date?: Date; updated?: Date; tags?: string[];
    translationKey?: string; draft?: boolean; cover?: unknown;
  };
  body?: string;
}
export interface Post {
  id: string; lang: Lang; title: string; description: string; summary?: string; date?: Date; updated?: Date;
  tags: string[]; translationKey?: string; path: string; categoryPaths: string[];
  categoryLabels: string[]; body: string; cover?: unknown;
}
export interface Category {
  lang: Lang; path: string; label: string; parentPath?: string; depth: number; posts: Post[];
}
export interface Tag { lang: Lang; path: string; label: string; posts: Post[] }
export interface BlogModel { posts: Post[]; categories: Category[]; tags: Tag[] }

function label(segment: string): string {
  return segment.replace(/[-_]+/g, ' ').replace(/^./u, first => first.toLocaleUpperCase());
}

function excerpt(body: string): string {
  const text = body.replace(/```[^\n]*\n[\s\S]*?```|~~~[^\n]*\n[\s\S]*?~~~/g, ' ')
    .replace(/^#{1,6}\s+.*$/gm, ' ')
    .replace(/<[^>]*>/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    .replace(/^\s*\[[^\]]+\]:.*$/gm, ' ').replace(/^[\s#>*+\-\d.]+/gm, '')
    .replace(/[*_`~]/g, '').replace(/\s+/g, ' ').trim();
  if (text.length <= 180) return text;
  const prefix = text.slice(0, 180);
  const boundary = prefix.lastIndexOf(' ');
  return `${prefix.slice(0, boundary > 0 ? boundary : 180).replace(/[.,;:!?]+$/, '')}…`;
}

function validate(raw: RawPost): { lang: Lang; segments: string[] } {
  const segments = raw.id.split('/');
  const lang = segments.shift();
  if (!isLang(lang)) throw new Error(`Unknown or invalid language in content ID: ${raw.id}`);
  if (!segments.length || segments.some(s => !s || s !== s.trim() || s === '.' || s === '..' || /[\\\u0000-\u001f\u007f]/.test(s))) {
    throw new Error(`Invalid content path: ${raw.id}`);
  }
  segments.forEach(slugify);
  for (const field of ['title', 'description', 'translationKey'] as const) {
    const value = raw.data[field];
    if (value !== undefined && (typeof value !== 'string' || !value.trim())) throw new Error(`Invalid ${field} in ${raw.id}`);
  }
  for (const field of ['date', 'updated'] as const) {
    const value = raw.data[field];
    if (value !== undefined && (!(value instanceof Date) || !Number.isFinite(value.getTime()))) throw new Error(`Invalid ${field} in ${raw.id}`);
  }
  if (raw.data.draft !== undefined && typeof raw.data.draft !== 'boolean') throw new Error(`Invalid draft in ${raw.id}`);
  if (raw.data.tags !== undefined && (!Array.isArray(raw.data.tags) || raw.data.tags.some(tag => typeof tag !== 'string' || !tag.trim()))) {
    throw new Error(`Invalid tags in ${raw.id}`);
  }
  return { lang, segments };
}

export function buildModel(raw: RawPost[]): BlogModel {
  const posts: Post[] = [];
  const categories = new Map<string, Category>();
  const tags = new Map<string, Tag>();
  const routes = new Map<string, { kind: string; source: string }>();
  const translationKeys = new Map<string, string>();
  const reserved = new Set(['tags', 'search', 'rss.xml', 'search-index.json'].map(slugify));
  function claim(path: string, kind: string, source: string): void {
    const existing = routes.get(path);
    if (existing && (existing.kind !== kind || existing.source !== source || kind === 'article')) {
      throw new Error(`URL collision at ${path}: ${existing.kind} ${existing.source} and ${kind} ${source}`);
    }
    routes.set(path, { kind, source });
  }
  for (const entry of raw) {
    const { lang, segments } = validate(entry);
    const key = entry.data.translationKey?.trim();
    if (key) {
      const identity = `${lang}:${key}`;
      const existing = translationKeys.get(identity);
      if (existing) throw new Error(`Duplicate translationKey ${key} in ${lang}: ${existing} and ${entry.id}`);
      translationKeys.set(identity, entry.id);
    }
    if (entry.data.draft) continue;
    const slugs = segments.map(segment => encodeURIComponent(slugify(segment)));
    if (reserved.has(slugify(segments[0]))) throw new Error(`Reserved route in ${entry.id}`);
    const path = `/${lang}/${slugs.join('/')}/`;
    claim(path, 'article', entry.id);
    const categoryPaths = segments.slice(0, -1).map((_, index) => `/${lang}/${slugs.slice(0, index + 1).join('/')}/`);
    const categoryLabels = segments.slice(0, -1).map(label);
    const post: Post = {
      id: entry.id, lang, path, title: entry.data.title?.trim() ?? label(segments.at(-1)!),
      description: entry.data.description?.trim() ?? excerpt(entry.body ?? ''),
      summary: entry.data.description?.trim(),
      date: entry.data.date, updated: entry.data.updated, tags: [...new Set(entry.data.tags?.map(tag => tag.trim()) ?? [])],
      translationKey: key, categoryPaths, categoryLabels, body: entry.body ?? '', cover: entry.data.cover,
    };
    posts.push(post);
    categoryPaths.forEach((categoryPath, index) => {
      claim(categoryPath, 'category', `${lang}/${segments.slice(0, index + 1).join('/')}`);
      let category = categories.get(categoryPath);
      if (!category) {
        category = { lang, path: categoryPath, label: categoryLabels[index], parentPath: categoryPaths[index - 1], depth: index + 1, posts: [] };
        categories.set(categoryPath, category);
      }
      category.posts.push(post);
    });
    for (const tagLabel of post.tags) {
      const tagPath = `/${lang}/tags/${encodeURIComponent(slugify(tagLabel))}/`;
      claim(tagPath, 'tag', tagLabel);
      let tag = tags.get(tagPath);
      if (!tag) { tag = { lang, path: tagPath, label: tagLabel, posts: [] }; tags.set(tagPath, tag); }
      tag.posts.push(post);
    }
  }
  const comparePosts = (a: Post, b: Post): number => (b.date?.getTime() ?? -Infinity) - (a.date?.getTime() ?? -Infinity) || a.path.localeCompare(b.path);
  posts.sort(comparePosts);
  for (const item of [...categories.values(), ...tags.values()]) item.posts.sort(comparePosts);
  return {
    posts,
    categories: [...categories.values()].sort((a, b) => a.path.localeCompare(b.path)),
    tags: [...tags.values()].sort((a, b) => a.path.localeCompare(b.path)),
  };
}

export function getAlternate(model: BlogModel, post: Post, target: Lang): Post | undefined {
  if (!post.translationKey) return undefined;
  return model.posts.find(candidate => candidate.lang === target && candidate.translationKey === post.translationKey);
}
