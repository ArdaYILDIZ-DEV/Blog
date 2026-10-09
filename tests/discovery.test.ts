import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, cp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';

// All fixture writes and cleanup stay inside this test's disposable project.
test('real glob discovery, Unicode routes, collision failures and root/base builds', { timeout: 240000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ardas-blog-discovery-'));
  try {
    for (const path of ['src', 'content', 'astro.config.mjs', 'tsconfig.json', 'package.json']) await cp(path, join(dir, path), { recursive: true });
    await cp('node_modules', join(dir, 'node_modules'), { recursive: true });
    const put = async (path: string, content: string) => { await mkdir(join(dir, path, '..'), { recursive: true }); await writeFile(join(dir, path), content); };
    await put('content/tr/deneme/derin/新文章.md', '---\ntitle: Yeni keşfedilen yazı\ntranslationKey: discovery-pair\n---\nKeşif gövdesi.');
    await put('content/en/new/deep/discovered.md', '---\ntitle: Newly discovered article\ntranslationKey: discovery-pair\n---\nDiscovered body.');
    const build = (site: string, base: string) => spawnSync(process.execPath, [join(dir, 'node_modules/astro/bin/astro.mjs'), 'build'], { cwd: dir, env: { ...process.env, SITE_URL: site, BASE_PATH: base }, encoding: 'utf8', timeout: 45000 });
    const first = build('http://localhost:4321', '/Blog');
    assert.equal(first.status, 0, first.stdout + first.stderr);
    const article = await readFile(join(dir, 'dist/tr/deneme/derin/新文章/index.html'), 'utf8');
    assert.ok(article.includes('/Blog/en/new/deep/discovered/'));
    assert.ok((await readFile(join(dir, 'dist/tr/index.html'), 'utf8')).includes('/Blog/tr/deneme/'));
    const server = createServer(async (request, response) => {
      const path = decodeURIComponent(new URL(request.url!, 'http://localhost').pathname).replace(/^\/Blog\//, '');
      if (path.split('/').includes('..')) { response.writeHead(400).end(); return; }
      try { response.end(await readFile(join(dir, 'dist', path, 'index.html'))); }
      catch { response.writeHead(404).end(); }
    });
    await new Promise<void>(ready => server.listen(0, '127.0.0.1', ready));
    try {
      const address = server.address(); assert.ok(address && typeof address !== 'string');
      const response = await fetch(`http://127.0.0.1:${address.port}/Blog/tr/deneme/derin/%E6%96%B0%E6%96%87%E7%AB%A0/`);
      assert.equal(response.status, 200); assert.ok((await response.text()).includes('Yeni keşfedilen yazı'));
    } finally { server.closeAllConnections(); await new Promise<void>(closed => server.close(() => closed())); }
    const root = build('https://example.test', '/');
    assert.equal(root.status, 0, root.stdout + root.stderr);
    const rootHtml = await readFile(join(dir, 'dist/en/new/deep/discovered/index.html'), 'utf8');
    assert.ok(rootHtml.includes('https://example.test/en/new/deep/discovered/')); assert.ok(!rootHtml.includes('/Blog/'));
    await put('content/tr/deneme/derin/duplicate.md', '---\ntranslationKey: discovery-pair\n---\nCollision');
    const duplicate = build('https://example.test', '/');
    assert.notEqual(duplicate.status, 0); assert.match(duplicate.stdout + duplicate.stderr, /Duplicate translationKey/);
    await rm(join(dir, 'content/tr/deneme/derin/duplicate.md'));
    await put('content/en/new/deep/Discovered.md', '---\ntitle: Route collision\n---\nCollision');
    const collision = build('https://example.test', '/');
    assert.notEqual(collision.status, 0); assert.match(collision.stdout + collision.stderr, /URL collision/);
    await rm(join(dir, 'content/en/new/deep/Discovered.md'));
    await put('content/en/new/broken.md', '---\ntitle: Broken image\n---\n![Missing](./missing-image.png)');
    const broken = build('https://example.test', '/');
    assert.notEqual(broken.status, 0); assert.match(broken.stdout + broken.stderr, /missing-image|ImageNotFound|Could not resolve/);
    await rm(join(dir, 'content/en/new/broken.md'));
    await put('content/tr/invalid-date.md', '---\ntitle: Invalid date\ndate: 2026-02-30\n---\nDate must not roll over.');
    const invalidDate = build('https://example.test', '/');
    assert.notEqual(invalidDate.status, 0); assert.match(invalidDate.stdout + invalidDate.stderr, /date|ISO|2026-02-30/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
