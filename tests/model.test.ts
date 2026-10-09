import assert from 'node:assert/strict';
import test from 'node:test';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { buildModel, getAlternate, type RawPost } from '../src/lib/model.ts';

const raw = (id: string, data: RawPost['data'] = {}, body = '# Heading\n\nA **meaningful** excerpt with [a link](https://example.com).'): RawPost => ({ id, data, body });

test('translations use a stable key, not matching filenames or categories', () => {
  const model = buildModel([raw('tr/yazılım/ilk-yazı', { translationKey: 'intro' }), raw('en/development/first-post', { translationKey: 'intro' }), raw('tr/alone')]);
  assert.equal(getAlternate(model, model.posts.find(p => p.lang === 'tr' && p.translationKey)!, 'en')?.path, '/en/development/first-post/');
  assert.equal(getAlternate(model, model.posts.find(p => p.id === 'tr/alone')!, 'en'), undefined);
});

test('nested categories include descendant posts with original labels', () => {
  const model = buildModel([raw('tr/Yazılım/İleri TypeScript/İlk Yazı')]);
  assert.equal(model.posts[0].path, '/tr/yazilim/ileri-typescript/ilk-yazi/');
  assert.deepEqual(model.posts[0].categoryPaths, ['/tr/yazilim/', '/tr/yazilim/ileri-typescript/']);
  assert.deepEqual(model.categories.map(c => [c.label, c.depth, c.posts.length]), [['Yazılım', 1, 1], ['İleri TypeScript', 2, 1]]);
  assert.equal(model.categories[1].parentPath, '/tr/yazilim/');
  assert.equal(model.posts[0].title, 'İlk Yazı');
  assert.match(model.posts[0].description, /meaningful excerpt with a link/);
  assert.equal(model.posts[0].date, undefined);
});

test('Unicode paths are encoded once and empty content has no fabricated metadata', () => {
  const post = buildModel([raw('en/日本語/記事', {}, '')]).posts[0];
  assert.equal(post.path, `/en/${encodeURIComponent('日本語')}/${encodeURIComponent('記事')}/`);
  assert.equal(post.title, '記事');
  assert.equal(post.description, '');
  assert.equal(post.body, '');
  assert.equal(post.date, undefined);
  assert.deepEqual(buildModel([]), { posts: [], categories: [], tags: [] });
});

test('drafts never generate publication outputs', () => {
  const model = buildModel([raw('tr/private/draft', { draft: true, tags: ['secret'] }), raw('en/public')]);
  assert.deepEqual(model.posts.map(p => p.id), ['en/public']);
  assert.equal(model.categories.length, 0);
  assert.equal(model.tags.length, 0);
});

test('tags are language-specific and reuse exact labels', () => {
  const model = buildModel([raw('tr/a', { tags: ['Türkçe', 'Türkçe'] }), raw('tr/b', { tags: ['Türkçe'] }), raw('en/a', { tags: ['Türkçe'] })]);
  assert.equal(model.tags.find(t => t.lang === 'tr')?.posts.length, 2);
  assert.equal(model.tags.find(t => t.lang === 'tr')?.path, '/tr/tags/turkce/');
  assert.equal(model.tags.length, 2);
});

test('normalized article and category collisions are explicit', () => {
  for (const ids of [['tr/İlk', 'tr/ilk'], ['tr/şeker', 'tr/seker'], ['en/café', 'en/cafe\u0301'], ['en/A/post', 'en/a/other'], ['en/a', 'en/a/post']]) {
    assert.throws(() => buildModel(ids.map(id => raw(id))), /collision/i);
  }
});

test('reserved routes cannot be shadowed by articles or folders', () => {
  for (const name of ['tags', 'search', 'rss.xml', 'search-index.json']) {
    assert.throws(() => buildModel([raw(`tr/${name}`)]), /reserved|collision/i);
    assert.throws(() => buildModel([raw(`en/${name}/post`)]), /reserved|collision/i);
  }
});

test('normalized tag collisions cannot silently merge different names', () => {
  assert.throws(() => buildModel([raw('tr/a', { tags: ['Şeker'] }), raw('tr/b', { tags: ['seker'] })]), /collision/i);
});

test('frontmatter schema accepts dates without coercing missing dates or invalid strings', async () => {
  const { collections } = await import('../src/content.config.ts');
  const { z } = await import('astro/zod');
  const { parseFrontmatter } = await import('astro/markdown');
  const { readRawDates } = await import('../src/lib/frontmatter.ts');
  const factory = collections.posts.schema;
  assert.equal(typeof factory, 'function');
  if (typeof factory !== 'function') throw new Error('Expected the collection schema factory');
  const schema = factory({ image: () => z.object({
    src: z.string(), width: z.number(), height: z.number(),
    format: z.union([z.literal('png'), z.literal('jpg'), z.literal('jpeg'), z.literal('tiff'),
      z.literal('webp'), z.literal('gif'), z.literal('svg'), z.literal('avif'), z.literal('apng')]),
  }) });
  assert.equal(schema.parse({}).date, undefined);
  assert.equal(schema.parse({ date: '2024-02-29' }).date?.toISOString(), '2024-02-29T00:00:00.000Z');
  assert.equal(schema.parse({ date: '2024-02-29T12:30:00+03:00' }).date?.toISOString(), '2024-02-29T09:30:00.000Z');
  const yaml = parseFrontmatter('---\ndate: 2024-02-29\n---\nBody').frontmatter;
  assert.equal(schema.parse(yaml).date?.toISOString(), '2024-02-29T00:00:00.000Z');
  for (const date of ['2026-02-30', '2025-02-29', '2026-13-01', '2026-02-29T12:30:00Z', 'invalid', '', 0, null, new Date('bad')]) {
    assert.equal(schema.safeParse({ date }).success, false, `Invalid date accepted: ${String(date)}`);
  }
  const sourceData = (fields: string) => readRawDates(`---\n${fields}\n---\nBody`);
  assert.deepEqual(readRawDates('Body only'), {});
  assert.deepEqual(sourceData('title: No dates'), {});
  assert.equal(schema.parse(sourceData('date: 2024-02-29')).date?.toISOString(), '2024-02-29T00:00:00.000Z');
  assert.equal(schema.parse(sourceData('updated: 2024-03-01')).updated?.toISOString(), '2024-03-01T00:00:00.000Z');
  assert.equal(sourceData('date: 2026-02-30').date, '2026-02-30');
  for (const field of ['date', 'updated']) {
    for (const value of ['2026-02-30', '2025-02-29', 'null', '', '""', '0', 'false']) {
      assert.equal(schema.safeParse(sourceData(`${field}: ${value}`)).success, false, `${field}: ${value} accepted`);
    }
  }
  assert.equal(schema.safeParse(sourceData('defaults: &defaults {date: 2026-02-30}\n<<: *defaults')).success, false);
  assert.throws(() => readRawDates('+++\ndate = 2026-02-30\n+++\nBody'), /YAML/);
  assert.equal(schema.safeParse({ typo: 'unknown metadata' }).success, false);
  assert.equal(schema.safeParse({ tags: 'not an array' }).success, false);
  assert.equal(schema.safeParse({ draft: 'false' }).success, false);
});

test('Astro build rejects an unquoted impossible date instead of silently rolling it over', { timeout: 60000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'blog-date-build-'));
  const repository = fileURLToPath(new URL('../', import.meta.url));
  try {
    await mkdir(join(root, 'src/pages'), { recursive: true });
    await mkdir(join(root, 'content/en'), { recursive: true });
    await symlink(join(repository, 'node_modules'), join(root, 'node_modules'), 'dir');
    await cp(join(repository, 'src/content.config.ts'), join(root, 'src/content.config.ts'));
    await mkdir(join(root, 'src/lib'), { recursive: true });
    await cp(join(repository, 'src/lib/frontmatter.ts'), join(root, 'src/lib/frontmatter.ts'));
    await writeFile(join(root, 'package.json'), '{"type":"module"}');
    await writeFile(join(root, 'astro.config.mjs'), "export default { output: 'static' };\n");
    await writeFile(join(root, 'src/pages/index.astro'), "---\nimport { getCollection } from 'astro:content';\nconst posts = await getCollection('posts');\n---\n<p>{posts[0]?.data.date?.toISOString()}</p><p>{posts[0]?.data.updated?.toISOString()}</p>\n");
    await writeFile(join(root, 'content/en/date.md'), '---\ndate: 2026-02-30\n---\nBody');
    const build = () => spawnSync(process.execPath, [join(repository, 'node_modules/astro/bin/astro.mjs'), 'build', '--root', root], {
      cwd: root, encoding: 'utf8', timeout: 25000,
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
    });
    const invalid = build();
    assert.equal(invalid.error, undefined);
    assert.notEqual(invalid.status, 0, `${invalid.stdout}\n${invalid.stderr}`);
    assert.match(`${invalid.stdout}\n${invalid.stderr}`, /date.*(valid|invalid|ISO)|valid.*date/is);
    await writeFile(join(root, 'content/en/date.md'), '---\ndate: 2024-02-29\nupdated: 2024-03-01\n---\nBody');
    const valid = build();
    assert.equal(valid.error, undefined);
    assert.equal(valid.status, 0, `${valid.stdout}\n${valid.stderr}`);
    const output = await readFile(join(root, 'dist/index.html'), 'utf8');
    assert.match(output, /2024-02-29T00:00:00.000Z/);
    assert.match(output, /2024-03-01T00:00:00.000Z/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('generated previews skip headings and truncate at word boundaries with an ellipsis', () => {
  const body = `## Repeated heading\n\n${'Okunabilir kelimeler '.repeat(20)}`;
  const post = buildModel([raw('tr/note', {}, body)]).posts[0];
  assert.equal(post.summary, undefined);
  assert.ok(post.description.length <= 181);
  assert.ok(post.description.endsWith('…'));
  assert.doesNotMatch(post.description, /Repeated heading/);
  assert.match(post.description, /(?:Okunabilir|kelimeler)…$/);
  assert.equal(buildModel([raw('tr/short', {}, 'Kısa paragraf.')]).posts[0].description, 'Kısa paragraf.');
  const explicit = buildModel([raw('tr/explicit', { description: 'Özel açıklama.' }, body)]).posts[0];
  assert.equal(explicit.description, 'Özel açıklama.');
  assert.equal(explicit.summary, 'Özel açıklama.');
});

test('invalid paths, metadata and duplicate translation keys fail clearly', () => {
  for (const id of ['de/article', 'tr/!!!', 'tr/../article', '/tr/article', 'tr//article']) {
    assert.throws(() => buildModel([raw(id)]), /invalid|language/i);
  }
  assert.throws(() => buildModel([raw('tr/a', { date: new Date('bad') })]), /date/i);
  assert.throws(() => buildModel([raw('tr/a', { translationKey: 'x' }), raw('tr/b', { translationKey: 'x', draft: true })]), /translation/i);
});
