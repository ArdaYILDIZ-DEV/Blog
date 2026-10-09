import assert from 'node:assert/strict';
import test from 'node:test';
import { absoluteUrl, normalizeBase, slugify, withBase } from '../src/lib/urls.ts';
import { chooseLanguage, isLang, otherLang, t } from '../src/lib/i18n.ts';

test('saved supported language wins; browser preference order then English fallback', () => {
  assert.equal(chooseLanguage('en', ['tr-TR']), 'en');
  assert.equal(chooseLanguage('tr', ['en-US']), 'tr');
  assert.equal(chooseLanguage(null, ['de-DE', 'TR-tr', 'en-US']), 'tr');
  assert.equal(chooseLanguage('invalid', ['en-GB', 'tr']), 'en');
  assert.equal(chooseLanguage({}, ['fr']), 'en');
  assert.equal(chooseLanguage(undefined, []), 'en');
  assert.equal(isLang('tr-TR'), false);
  assert.equal(otherLang('tr'), 'en');
  assert.deepEqual(Object.keys(t('tr')).sort(), Object.keys(t('en')).sort());
});

test('root and repository base paths are consistently joined', () => {
  assert.equal(normalizeBase(''), '/');
  assert.equal(normalizeBase('/'), '/');
  assert.equal(normalizeBase('Blog/'), '/Blog/');
  assert.equal(withBase('/tr/'), '/tr/');
  assert.equal(withBase('/tr/', '/Blog/'), '/Blog/tr/');
  assert.equal(withBase('en/search-index.json', '/Blog'), '/Blog/en/search-index.json');
  assert.equal(withBase('/', '/Blog/'), '/Blog/');
  assert.equal(absoluteUrl('/en/', 'https://example.com', '/Blog'), 'https://example.com/Blog/en/');
  assert.equal(absoluteUrl('/tr/', 'https://example.com/Blog/', '/Blog'), 'https://example.com/Blog/tr/');
  assert.throws(() => normalizeBase('/../Blog'), /invalid/i);
  assert.throws(() => withBase('//evil.example', '/Blog/'), /invalid/i);
});

test('encoded Unicode URLs preserve one encoding and reject encoded traversal', () => {
  const path = `/en/${encodeURIComponent('日本語')}/`;
  assert.equal(withBase(path, '/Blog/'), `/Blog${path}`);
  assert.equal(absoluteUrl(path, 'https://example.com', '/Blog/'), `https://example.com/Blog${path}`);
  assert.equal(absoluteUrl('/en/日本語/', 'https://example.com'), `https://example.com${path}`);
  for (const invalid of ['/en/%2e%2e/', '/en/%2F/', '/en/%5c/', '/en/%00/', '/en/%zz/']) {
    assert.throws(() => withBase(invalid, '/Blog/'), /invalid/i);
  }
});

test('Turkish, case and Unicode names normalize predictably', () => {
  assert.equal(slugify('İĞÜŞÖÇ ı'), 'igusoc-i');
  assert.equal(slugify('Iıİi'), 'iiii');
  assert.equal(slugify('IŞIK'), slugify('ışık'));
  assert.equal(slugify('Cafe\u0301'), slugify('Café'));
  assert.equal(slugify('Hello_world'), 'hello-world');
  assert.throws(() => slugify('!!!'), /invalid/i);
});
