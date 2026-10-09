import assert from 'node:assert/strict';
import { readFile, readdir, access, cp, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const site = process.env.SITE_URL || 'http://localhost:4321';
const base = (process.env.BASE_PATH || '/').replace(/\/$/, '');
const read = (path: string) => readFile(join('dist', path), 'utf8');
async function files(path: string): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(join(path, entry.name)) : [join(path, entry.name)]))).flat();
}

const trArticle = '/tr/notes/pi-kullanimim/';
const enArticle = '/en/notes/pi-usage/';

test('real language pages have canonical, actual hreflang and localized metadata', async () => {
  const tr = await read('tr/notes/pi-kullanimim/index.html');
  const en = await read('en/notes/pi-usage/index.html');
  assert.match(tr, /<html\b[^>]*\blang="tr"/); assert.match(en, /<html\b[^>]*\blang="en"/);
  for (const html of [tr, en]) {
    assert.ok(html.includes(`${site}${base}${trArticle}`));
    assert.ok(html.includes(`${site}${base}${enArticle}`));
    assert.match(html, /property="og:title"/); assert.match(html, /rel="canonical"/);
  }
  assert.match(tr, /hreflang="en"/); assert.match(en, /hreflang="tr"/);
  const missing = await read('en/notes/reading/index.html');
  assert.doesNotMatch(missing, /<link[^>]+hreflang="tr"/);
});

test('drafts are absent from every text output and language search contains full body', async () => {
  for (const path of await files('dist')) {
    if (/\.(html|json|xml|txt)$/.test(path)) assert.ok(!(await readFile(path, 'utf8')).includes('DRAFT_PRIVATE_SENTINEL'), path);
  }
  const tr = JSON.parse(await read('tr/search-index.json'));
  const en = JSON.parse(await read('en/search-index.json'));
  assert.equal(tr.length, 2); assert.equal(en.length, 2);
  assert.ok(tr.some((post: { body: string }) => post.body.includes('Doğrulama')));
  assert.ok(en.some((post: { body: string }) => post.body.includes('Verification')));
  for (const post of [...tr, ...en]) { assert.ok(post.path.startsWith(`${base}/`)); assert.doesNotMatch(post.body, /<[^>]+>/); }
});

test('RSS excludes undated notes and sitemap enumerates published routes', async () => {
  const tr = await read('tr/rss.xml'); const en = await read('en/rss.xml');
  assert.match(tr, /<language>tr<\/language>/); assert.match(en, /<language>en<\/language>/);
  assert.ok(tr.includes(`<link>${site}${base}/tr/</link>`));
  assert.ok(en.includes(`<link>${site}${base}/en/</link>`));
  assert.doesNotMatch(tr, /<item>/); assert.doesNotMatch(en, /<item>/);
  const sitemap = await read('sitemap.xml');
  for (const path of [trArticle, enArticle, '/tr/notes/markdown-test/', '/en/notes/reading/', '/tr/tags/', '/en/tags/', '/tr/notes/', '/en/notes/']) {
    assert.ok(sitemap.includes(`<loc>${site}${base}${path}</loc>`), path);
  }
  assert.ok(!sitemap.includes('/taslak/'));
  assert.ok((await read('robots.txt')).includes(`${site}${base}/sitemap.xml`));
});

test('RSS publishes dated notes while excluding drafts and undated notes', { timeout: 60000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'blog-rss-output-'));
  try {
    for (const path of ['src', 'content', 'astro.config.mjs', 'tsconfig.json', 'package.json']) await cp(path, join(root, path), { recursive: true });
    // Astro's virtual module paths must resolve inside the disposable project.
    await cp('node_modules', join(root, 'node_modules'), { recursive: true });
    for (const lang of ['tr', 'en']) {
      await writeFile(join(root, `content/${lang}/notes/dated-fixture.md`), `---\ntitle: RSS dated ${lang}\ndate: 2024-02-29\n---\nRSS fixture body.\n`);
    }
    const build = spawnSync(process.execPath, [join(process.cwd(), 'node_modules/astro/bin/astro.mjs'), 'build'], {
      cwd: root, encoding: 'utf8', timeout: 45000,
      env: { ...process.env, SITE_URL: site, BASE_PATH: base || '/', ASTRO_TELEMETRY_DISABLED: '1' },
    });
    assert.equal(build.error, undefined);
    assert.equal(build.status, 0, build.stdout + build.stderr);
    for (const lang of ['tr', 'en']) {
      const feed = await readFile(join(root, `dist/${lang}/rss.xml`), 'utf8');
      assert.equal((feed.match(/<item>/g) ?? []).length, 1);
      assert.ok(feed.includes(`<title>RSS dated ${lang}</title>`));
      assert.ok(feed.includes(`${site}${base}/${lang}/notes/dated-fixture/`));
      assert.match(feed, /<pubDate>Thu, 29 Feb 2024 00:00:00 GMT<\/pubDate>/);
      assert.doesNotMatch(feed, /DRAFT_PRIVATE_SENTINEL|Notes on reading code|Pi ile çalışma biçimim|How I work with Pi/);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('local Markdown images and emitted assets resolve beneath configured base', async () => {
  const html = await read('tr/notes/markdown-test/index.html');
  const sources = [...html.matchAll(/(?:src|href)="([^"?#]+)"/g)].map(match => match[1]);
  const assets = sources.filter(path => path.includes('/_astro/'));
  assert.ok(assets.some(path => /\.svg$/.test(path)), 'Markdown image emitted');
  for (const path of assets) { assert.ok(path.startsWith(`${base}/_astro/`), path); await access(join('dist', path.slice(base.length))); }
  assert.match(html, /<table/); assert.match(html, /astro-code/);
  assert.match(html, /class="table-scroll"[^>]*tabindex="0"/);
  assert.match(html, /<th[^>]*scope="col"/);
  assert.ok(html.includes(`href="${base}/tr/">Ana sayfaya dön`));
  for (const color of ['#6da7ec', '#7fb88a', '#d9a441', '#94928b']) assert.ok(html.toLowerCase().includes(color), `syntax color ${color}`);
});
