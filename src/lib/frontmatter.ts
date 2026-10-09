import { readFile } from 'node:fs/promises';
import { extractFrontmatter } from 'astro/markdown';
import type { Loader } from 'astro/loaders';
import { parseDocument } from 'yaml';

export function readRawDates(source: string): Record<string, unknown> {
  const frontmatter = extractFrontmatter(source);
  if (frontmatter === undefined) return {};
  if (source.trimStart().startsWith('+++')) {
    throw new Error('Use YAML frontmatter (---), not TOML (+++), to preserve and validate source dates.');
  }
  // Astro enables YAML timestamps, which can normalize impossible calendar dates.
  const document = parseDocument(frontmatter, { schema: 'core', merge: true });
  if (document.errors.length) throw document.errors[0];
  if (document.contents === null) return {};
  const data: unknown = document.toJS();
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Frontmatter must be a YAML mapping.');
  }
  return Object.fromEntries(['date', 'updated'].filter(field => Object.hasOwn(data, field))
    .map(field => [field, Reflect.get(data, field)]));
}

export function withRawDates(loader: Loader): Loader {
  return {
    ...loader,
    name: 'validated-dates-glob-loader',
    async load(context) {
      await loader.load({
        ...context,
        async parseData(options) {
          if (!options.filePath) throw new Error(`Missing source file path for ${options.id}`);
          const dates = readRawDates(await readFile(options.filePath, 'utf8'));
          return context.parseData({ ...options, data: Object.assign({ ...options.data }, dates) });
        },
      });
    },
  };
}
