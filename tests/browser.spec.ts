import { test as baseTest, expect, type Browser, type Page } from '@playwright/test';
// Isolate browser lifetimes, including Chromium distributions that exit on context closure.
const test = baseTest.extend<{ isolatedBrowser: Browser }>({
  isolatedBrowser: async ({ playwright }, use) => {
    const browser = await playwright.chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
    await use(browser);
    await browser.close();
  },
  context: async ({ isolatedBrowser, contextOptions }, use) => {
    const context = await isolatedBrowser.newContext(contextOptions);
    await use(context);
    await context.close();
  },
});
async function selectTheme(page: Page, value: 'light' | 'dark' | 'system'): Promise<void> {
  await page.locator('[data-theme-trigger]').click();
  await page.locator(`[data-theme-option="${value}"]`).click();
}
const tr = 'tr/notes/pi-kullanimim/';
const en = 'en/notes/pi-usage/';
const markdown = 'tr/notes/markdown-test/';

test('instant translation updates real content, SEO and history without reloading', async ({ page }) => {
  await page.goto(tr);
  await page.evaluate(() => { (window as Window & { marker?: string }).marker = 'persistent'; });
  await selectTheme(page, 'light');
  await page.locator('[data-language="en"]').click();
  await expect(page).toHaveURL(new RegExp(en));
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('h1')).toHaveText('How I work with Pi');
  await expect(page.locator('.prose')).toContainText('find and fix the cause');
  await expect(page).toHaveTitle(/How I work with Pi/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(en));
  expect(await page.evaluate(() => (window as Window & { marker?: string }).marker)).toBe('persistent');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await page.evaluate(() => localStorage.getItem('blog-language'))).toBe('en');
  await page.goBack(); await expect(page.locator('h1')).toHaveText('Pi ile çalışma biçimim');
  await page.goForward(); await expect(page.locator('h1')).toHaveText('How I work with Pi');
  await page.locator('[data-language="tr"]').click();
  await expect(page.locator('.prose')).toContainText('nedenini bulup düzeltmesini');
});

test('root language priority and direct URLs', async ({ page }) => {
  await page.goto('en/');
  await page.evaluate(() => localStorage.setItem('blog-language', 'tr'));
  await page.goto('./'); await expect(page).toHaveURL(/\/tr\/$/);
  await page.goto('en/'); await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('storage failure does not break translation or theme', async ({ context, page }) => {
  await context.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked for test'); } }));
  await page.goto(tr); await page.locator('[data-language="en"]').click();
  await expect(page.locator('h1')).toHaveText('How I work with Pi');
  await selectTheme(page, 'light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('missing translation has a safe, explained fallback', async ({ page }) => {
  await page.goto(markdown);
  await page.locator('[data-language="en"]').click();
  await expect(page).toHaveURL(/\/en\/\?translation=missing/);
  await expect(page.locator('[data-translation-notice]')).toBeVisible();
});

test('full-body search is scoped to the selected language', async ({ page }) => {
  await page.goto('tr/search/'); await page.locator('[data-search-input]').fill('kapsam');
  await expect(page.locator('[data-search-results]')).toContainText('Pi ile çalışma biçimim');
  await page.locator('[data-language="en"]').click();
  await expect(page).toHaveURL(/\/en\/search\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('[data-search-input]')).toHaveAttribute('data-index', /\/en\/search-index\.json$/);
  await page.locator('[data-search-input]').fill('verification');
  await expect(page.locator('[data-search-input]')).toHaveValue('verification');
  await expect(page.locator('[data-search-results]')).toContainText('How I work with Pi');
  await page.locator('[data-search-input]').fill('kapsam');
  await expect(page.locator('[data-search-results] li')).toHaveCount(0);
});

test('clipboard enhancement copies code', async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(markdown); await page.locator('[data-copy-code]').first().click();
  await expect(page.locator('.copy-status').first()).toContainText('Kopyalandı');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('function selamla');
});

for (const width of [390, 1440]) test(`responsive reading and basic accessibility at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 }); await page.goto(tr);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  for (const image of await page.locator('img').all()) await expect(image).toHaveAttribute('alt', /.+/);
  await page.keyboard.press('Tab'); await expect(page.locator('.skip-link')).toBeFocused();
  await page.screenshot({ path: `test-results/article-${width}.png`, fullPage: true });
});

test('JavaScript-off pages, root language links and translation remain usable', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage(); await page.goto(baseURL!);
  await page.getByRole('link', { name: 'Türkçe', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
  await page.goto(new URL(tr, baseURL!).href); await page.locator('[data-language="en"]').click();
  await expect(page.locator('h1')).toHaveText('How I work with Pi');
  await page.goto(new URL('en/notes/reading/', baseURL!).href);
  await expect(page.locator('.translation-hint')).toBeVisible();
  await expect(page.locator('[data-language="tr"]')).toHaveAttribute('href', /translation=missing/);
  await expect(page.locator('.table-scroll')).toHaveCount(0);
  await page.locator('[data-language="tr"]').click();
  await expect(page).toHaveURL(/\/tr\/\?translation=missing#translation-missing/);
  await expect(page.locator('[data-translation-notice]')).toBeVisible();
  await page.goto(new URL(markdown, baseURL!).href);
  await expect(page.locator('.table-scroll')).toHaveCount(2);
  for (const table of await page.locator('.table-scroll').all()) await expect(table).toHaveAttribute('tabindex', '0');
  await expect(page.locator('th').first()).toHaveAttribute('scope', 'col');
  await context.close();
});

test('category and 404 language links do not claim an article translation is missing', async ({ page }) => {
  for (const route of ['tr/notes/', '404.html']) {
    await page.goto(route);
    await expect(page.locator('.translation-hint')).toHaveCount(0);
    await expect(page.locator('[data-translation-notice]')).toBeHidden();
    const target = route === '404.html' ? 'tr' : 'en';
    await expect(page.locator(`[data-language="${target}"]`)).not.toHaveAttribute('href', /translation=missing/);
    await page.locator(`[data-language="${target}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/${target}/$`));
    await expect(page.locator('[data-translation-notice]')).toBeHidden();
  }
});

for (const width of [390, 1024]) test(`touch preferences keep 44px targets at ${width}px`, async ({ isolatedBrowser, baseURL }) => {
  const context = await isolatedBrowser.newContext({ hasTouch: true, viewport: { width, height: 900 }, baseURL });
  try {
    const page = await context.newPage(); await page.goto(tr);
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
    for (const control of await page.locator('[data-language], [data-theme-trigger], .toc summary').all()) {
      await expect(control).toBeVisible();
      const box = await control.boundingBox(); expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await context.close(); }
});

test('list, section and search heading roles use the specified sans typography', async ({ page }) => {
  const checkHeadings = async () => {
    const headings = page.locator('main h2'); expect(await headings.count()).toBeGreaterThan(0);
    for (const heading of await headings.all()) {
      const style = await heading.evaluate(node => {
        const computed = getComputedStyle(node);
        return { family: computed.fontFamily, weight: computed.fontWeight, size: parseFloat(computed.fontSize), line: parseFloat(computed.lineHeight) };
      });
      expect(style.family).toMatch(/Instrument Sans/); expect(style.weight).toBe('600');
      expect(style.size).toBeGreaterThanOrEqual(20); expect(style.size).toBeLessThanOrEqual(24);
      expect(style.line / style.size).toBeCloseTo(1.3, 2);
    }
  };
  await page.goto('en/'); await checkHeadings();
  await page.goto('en/search/'); await page.locator('[data-search-input]').fill('verification');
  await expect(page.locator('[data-search-results]')).toContainText('How I work with Pi');
  await checkHeadings();
});

test('code labels, inline code and copy feedback match the preference tokens', async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(markdown); await selectTheme(page, 'dark');
  const keyword = page.locator('.prose pre code span').filter({ hasText: /^const$/ }).first();
  await expect(keyword).toHaveCSS('color', 'rgb(109, 167, 236)');
  await selectTheme(page, 'light');
  await expect(keyword).toHaveCSS('color', 'rgb(42, 100, 168)');
  await selectTheme(page, 'dark');
  const label = page.locator('.code-language').first();
  await expect(label).toHaveCSS('color', 'rgb(148, 146, 139)'); await expect(label).toHaveCSS('font-size', '12px');
  const inline = page.locator('.prose td code').first();
  await expect(inline).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.06)');
  const ratio = await inline.evaluate(node => parseFloat(getComputedStyle(node).fontSize) / parseFloat(getComputedStyle(node.parentElement!).fontSize));
  expect(ratio).toBeCloseTo(0.9, 2);
  const copy = page.locator('[data-copy-code]').first(); const icon = copy.locator('svg');
  await expect(icon).toHaveAttribute('stroke-width', '1.5'); await expect(icon).toHaveAttribute('aria-hidden', 'true');
  await expect(copy).toHaveAttribute('aria-label', 'Kodu kopyala');
  const initialPath = await icon.locator('path').first().getAttribute('d'); expect(initialPath).toBeTruthy();
  await copy.click();
  await expect(page.locator('.copy-status').first()).toContainText('Kopyalandı');
  await expect(page.locator('.copy-status').first()).toHaveAttribute('aria-live', 'polite');
  await expect(icon).toHaveCSS('color', 'rgb(127, 184, 138)');
  await expect(icon.locator('path').first()).not.toHaveAttribute('d', initialPath!);
  await expect(icon.locator('path').first()).toHaveAttribute('d', initialPath!, { timeout: 2500 });
  await expect(copy).toHaveAttribute('aria-label', 'Kodu kopyala');
});

test('copy feedback is inline only, stable in size, and accessible without a duplicate visible status', async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(markdown);
  const copy = page.locator('[data-copy-code]').first();
  const before = await copy.boundingBox();
  await copy.click();
  await expect(copy.locator('.copy-label')).toHaveText('Kopyalandı');
  await expect(copy.locator('.copy-label')).toBeVisible();
  const status = page.locator('.copy-status').first();
  await expect(status).toContainText('Kopyalandı');
  await expect(status).toHaveCSS('position', 'absolute');
  await expect(status).toHaveCSS('clip-path', 'inset(50%)');
  const after = await copy.boundingBox();
  expect(after!.width).toBe(before!.width);
  await expect(copy).toHaveAttribute('data-copied', 'false', { timeout: 2500 });
  await expect(status).toHaveText('');
  await copy.click();
  await expect(copy).toHaveAttribute('data-copied', 'true');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('function selamla');
});

test('clipboard failure stays visible and a successful retry clears it', async ({ page }) => {
  await page.goto(markdown);
  await page.evaluate(() => {
    let calls = 0;
    Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: async () => {
      if (calls++ === 0) throw new DOMException('Clipboard denied', 'NotAllowedError');
    } });
  });
  const copy = page.locator('[data-copy-code]').first();
  const status = page.locator('.copy-status').first();
  await copy.click();
  await expect(status).toContainText('Kopyalanamadı');
  await expect(status).toHaveAttribute('data-error', 'true');
  await expect(status).toHaveCSS('position', 'static');
  await expect(copy).toHaveAttribute('data-copied', 'false');
  await copy.click();
  await expect(copy).toHaveAttribute('data-copied', 'true');
  await expect(status).not.toHaveAttribute('data-error', 'true');
  await expect(status).toHaveCSS('clip-path', 'inset(50%)');
});

for (const width of [390, 1440]) test(`topbar search submits from an article and preserves the query at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(tr);
  await expect(page.locator('.desktop-sidebar a[href$="/search/"]')).toHaveCount(0);
  const input = page.locator('.topbar [data-search-input]');
  await expect(input).toBeVisible();
  await expect(page.locator('[data-search-input]')).toHaveCount(1);
  await input.fill('kapsam');
  await input.press('Enter');
  await expect(page).toHaveURL(/\/tr\/search\/\?q=kapsam/);
  await expect(input).toHaveValue('kapsam');
  await expect(page.locator('[data-search-results]')).toContainText('Pi ile çalışma biçimim');
  await input.fill('eşleşmeyen-sözcük');
  await expect(page.locator('[data-search-results] li')).toHaveCount(0);
  await input.fill('kapsam');
  await expect(page.locator('[data-search-results]')).toContainText('Pi ile çalışma biçimim');
  await page.reload();
  await expect(input).toHaveValue('kapsam');
  await expect(page.locator('[data-search-results]')).toContainText('Pi ile çalışma biçimim');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('drawer opens and closes with a short transition and restores keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('en/');
  const trigger = page.locator('[data-open-menu]');
  const drawer = page.locator('#mobile-navigation');
  await trigger.click();
  await expect(drawer).toHaveCSS('opacity', '1');
  await expect(drawer).toHaveCSS('transition-duration', '0.24s, 0.24s, 0.24s, 0.24s');
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('sidebar removes the marked ornaments and controls use 120ms compositor feedback', async ({ page }) => {
  await page.goto('en/');
  await expect(page.locator('.brand-mark')).toHaveCount(0);
  const selected = page.locator('.desktop-sidebar .nav-row[aria-current="page"]');
  expect(await selected.evaluate(node => getComputedStyle(node, '::before').content)).toBe('none');
  const chip = page.locator('main .chip').first();
  await expect(chip).toHaveCSS('transition-duration', '0.12s, 0.12s');
  await expect(chip).toHaveCSS('transition-property', 'transform, opacity');
  await chip.hover();
  await expect(chip).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -1)');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(chip).toHaveCSS('transition-duration', '0s');
  await expect(chip).toHaveCSS('transform', 'none');
});

for (const width of [390, 1440]) test(`warm editorial surfaces and a single compact search heading at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('en/search/?q=verification');
  await selectTheme(page, 'dark');
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(21, 20, 19)');
  await expect(page.locator('.topbar-search')).toHaveCSS('background-color', 'rgb(38, 35, 32)');
  await expect(page.locator('main .breadcrumb, main .eyebrow')).toHaveCount(0);
  await expect(page.locator('h1')).toHaveText('Search results');
  await expect(page.locator('h1')).toHaveCSS('font-size', '28px');
  await expect(page.locator('[data-search-results]')).toContainText('How I work with Pi');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/warm-search-${width}.png`, fullPage: true });
  await page.goto('tr/');
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(21, 20, 19)');
  await page.screenshot({ path: `test-results/warm-home-${width}.png`, fullPage: true });
});

for (const width of [390, 900, 1100, 1440]) test(`home refinement: purposeful list and balanced search at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('tr/'); await selectTheme(page, 'dark');
  await expect(page.locator('.intro .eyebrow')).toHaveText('Yazılar');
  await expect(page.locator('.brand-caption')).toHaveCount(0);
  for (const brand of await page.locator('.brand').all()) await expect(brand).toHaveText("Arda's Blog");
  const section = page.getByRole('region', { name: 'Tüm yazılar' });
  await expect(section).toBeVisible();
  await expect(section.locator('.section-heading')).toHaveCSS('border-bottom-style', 'solid');
  const count = await section.locator('.post-preview').count();
  await expect(section.locator('.section-heading span')).toHaveText(`${count} yazı`);
  const searchBox = await page.locator('.topbar-search').boundingBox();
  const preferencesBox = await page.locator('.preferences').boundingBox();
  expect(searchBox).not.toBeNull(); expect(preferencesBox).not.toBeNull();
  if (width >= 1100) {
    const readingBox = await page.locator('main').boundingBox();
    expect(searchBox!.x + searchBox!.width / 2).toBeCloseTo(readingBox!.x + readingBox!.width / 2, 1);
  }
  if (width > 700) expect(searchBox!.x + searchBox!.width).toBeLessThan(preferencesBox!.x);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('[data-focus-search]').click(); await expect(page.locator('[data-search-input]')).toBeFocused();
  await page.screenshot({ path: `test-results/home-refined-${width}.png`, fullPage: true });
});

test('home refinement: language indicator slides both ways without stale links', async ({ page }) => {
  await page.goto('tr/');
  await page.evaluate(() => { (window as Window & { marker?: string }).marker = 'language-slider'; });
  const control = page.locator('.language-control');
  const transform = () => control.evaluate(node => getComputedStyle(node, '::before').transform);
  expect(await transform()).toBe('matrix(1, 0, 0, 1, 0, 0)');
  await page.locator('[data-language="en"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(control).toHaveAttribute('data-active-language', 'en');
  await expect(control).toHaveAttribute('data-language-from', 'tr');
  expect(await control.evaluate(node => getComputedStyle(node, '::before').animationName)).toBe('language-slide');
  expect(await control.evaluate(node => getComputedStyle(node, '::before').animationDuration)).toBe('0.12s');
  await expect.poll(transform).not.toBe('matrix(1, 0, 0, 1, 0, 0)');
  await expect(page.locator('[data-language="en"]')).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('.intro .eyebrow')).toHaveText('Writing');
  await expect(page.locator('#posts-heading')).toHaveText('All posts');
  expect(await page.evaluate(() => (window as Window & { marker?: string }).marker)).toBe('language-slider');
  await page.locator('[data-language="tr"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
  await expect(control).toHaveAttribute('data-language-from', 'en');
  await expect.poll(transform).toBe('matrix(1, 0, 0, 1, 0, 0)');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('[data-language="en"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(await control.evaluate(node => getComputedStyle(node, '::before').animationName)).toBe('none');
  await expect(page.locator('[data-language="tr"]')).toHaveAttribute('href', /\/tr\/$/);
  await page.goBack(); await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
});

test('design regression: summaries are explicit in articles and complete in previews', async ({ page }) => {
  await page.goto('tr/notes/pi-kullanimim/');
  await expect(page.locator('.article-header .description')).toHaveCount(0);
  await expect(page.locator('.article-header .post-meta')).toHaveCount(0);
  await expect(page.locator('.prose')).toContainText('İsteğim açıksa');
  await page.goto('tr/notes/markdown-test/');
  await expect(page.locator('.article-header .description')).toHaveText('Başlıklar, listeler, tablolar, kod, görseller ve dipnotlar için tek sayfalık görünüm testi.');
  await page.goto('tr/');
  const preview = page.locator('.post-preview').filter({ hasText: 'Pi ile çalışma biçimim' }).locator('p');
  await expect(preview).toHaveText(/…$/);
  await expect(preview).not.toContainText('İşi başlatırken');
});

test('design regression: Ctrl and Cmd K focus the existing search and submission works', async ({ page }) => {
  await page.goto('tr/notes/markdown-test/');
  const input = page.locator('[data-search-input]');
  await page.keyboard.press('Control+k'); await expect(input).toBeFocused();
  await input.fill('dipnot');
  await page.locator('.article-header h1').click();
  await page.keyboard.press('Meta+k'); await expect(input).toBeFocused();
  expect(await input.evaluate(node => (node as HTMLInputElement).selectionStart)).toBe(0);
  await input.press('Enter');
  await expect(page).toHaveURL(/\/tr\/search\/\?q=dipnot/);
  await expect(page.locator('[data-search-results]')).toContainText('Markdown test notu');
  await page.locator('[data-focus-search]').click(); await expect(input).toBeFocused();
});

test('design regression: animated theme menu supports keyboard, dismissal and persistence', async ({ page }) => {
  await page.goto('tr/');
  const trigger = page.locator('[data-theme-trigger]');
  const panel = page.locator('#theme-options');
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveCSS('animation-name', 'surface-enter');
  await page.screenshot({ path: 'test-results/theme-menu.png' });
  await page.keyboard.press('End'); await expect(page.locator('[data-theme-option="light"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(panel).toBeHidden(); await expect(trigger).toBeFocused();
  await expect(trigger).toContainText('Açık');
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await trigger.click(); await page.keyboard.press('Escape');
  await expect(panel).toBeHidden(); await expect(trigger).toBeFocused();
  await trigger.click(); await page.locator('h1').click(); await expect(panel).toBeHidden();
  await trigger.click(); await page.locator('[data-theme-option="dark"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await trigger.click(); await page.locator('[data-theme-option="system"]').click();
  expect(await page.evaluate(() => localStorage.getItem('blog-theme'))).toBe('system');
  await page.locator('[data-language="en"]').click();
  await expect(page.locator('[data-theme-trigger]')).toContainText('System');
  await page.locator('[data-theme-trigger]').click();
  await expect(page.locator('#theme-options')).toBeVisible();
});

for (const width of [390, 700, 1440]) test(`design regression: Markdown coverage and contained scrolling at ${width}px`, async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.setViewportSize({ width, height: 900 });
  await page.goto('tr/notes/markdown-test/');
  for (const selector of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'del', 'blockquote blockquote', 'hr', 'dl', 'kbd', 'mark', 'sub', 'sup', 'br']) {
    expect(await page.locator(`.prose ${selector}`).count(), selector).toBeGreaterThan(0);
  }
  await expect(page.locator('.prose .task-list-item input')).toHaveCount(3);
  await expect(page.locator('.prose .task-list-item input').first()).toBeChecked();
  await expect(page.locator('.prose .footnotes li')).toHaveCount(2);
  await expect(page.locator('.toc a[href="#footnote-label"]')).toHaveCount(0);
  await expect(page.locator('.prose a[data-footnote-ref]').first()).toHaveAttribute('href', '#user-content-fn-kisa');
  await expect(page.locator('.prose a[href$="/tr/"]')).toHaveCount(1);
  await expect(page.locator('.prose img')).toHaveAttribute('alt', /Markdown testi/);
  await page.locator('.prose img').scrollIntoViewIfNeeded();
  await expect(page.locator('.prose img')).toHaveJSProperty('naturalWidth', 720);
  await expect(page.locator('.table-scroll')).toHaveCount(2);
  await expect(page.locator('.table-scroll th').first()).toHaveAttribute('scope', 'col');
  await expect(page.locator('.table-scroll th').nth(2)).toHaveCSS('text-align', 'right');
  expect(await page.locator('.table-scroll').last().evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true);
  await expect(page.locator('.prose pre')).toHaveCount(6);
  expect(await page.locator('.prose pre').nth(4).evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true);
  const expectedCode = await page.locator('.prose pre code').first().textContent();
  await page.locator('[data-copy-code]').first().click();
  await expect(page.locator('.copy-status').first()).toContainText('Kopyalandı');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expectedCode);
  await page.locator('.prose details summary').click();
  await expect(page.locator('.prose details p')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const theme of ['dark', 'light']) {
    await page.locator('[data-theme-trigger]').click();
    await page.locator(`[data-theme-option="${theme}"]`).click();
    await page.screenshot({ path: `test-results/markdown-${theme}-${width}.png`, fullPage: true });
  }
  await page.goto('tr/tags/');
  for (const badge of await page.locator('.count:visible').all()) {
    const box = await badge.boundingBox(); expect(box).not.toBeNull();
    await expect(badge).toHaveCSS('height', '18px');
    expect(box!.height).toBeCloseTo(18, 3);
    expect(Math.round(box!.width * 1000) / 1000).toBeGreaterThanOrEqual(18);
  }
  await page.screenshot({ path: `test-results/tags-${width}.png`, fullPage: true });
});

test('design regression: reduced motion disables panel and content movement', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('tr/notes/markdown-test/');
  await page.locator('[data-theme-trigger]').click();
  await expect(page.locator('#theme-options')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('#theme-options')).toHaveCSS('transition-duration', '0s');
  await expect(page.locator('#theme-options')).toHaveCSS('filter', 'none');
  await page.keyboard.press('Escape');
  await expect(page.locator('.article-header')).toHaveCSS('animation-name', 'none');
});

test('design regression: Markdown remains readable without JavaScript', async ({ isolatedBrowser, baseURL }) => {
  const context = await isolatedBrowser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(new URL('tr/notes/markdown-test/', baseURL!).href);
    await expect(page.locator('.prose pre')).toHaveCount(6);
    await expect(page.locator('.table-scroll')).toHaveCount(2);
    await expect(page.locator('.footnotes')).toBeVisible();
    await page.locator('.prose details summary').click();
    await expect(page.locator('.prose details p')).toBeVisible();
  } finally { await context.close(); }
});

test('passive icons, keyboard focus and reduced-motion drawer preserve preference details', async ({ page }) => {
  await page.goto('en/'); await selectTheme(page, 'dark');
  const tagsLink = page.locator('.desktop-sidebar .nav-row').filter({ hasText: 'Tags' });
  const icon = tagsLink.locator('svg');
  await expect(icon).toHaveCSS('color', 'rgb(137, 135, 129)');
  await tagsLink.hover(); await expect(icon).toHaveCSS('color', 'rgb(240, 239, 236)');
  await page.keyboard.press('Tab');
  await page.locator('.skip-link').focus(); await expect(page.locator('.skip-link')).toHaveCSS('outline-offset', '2px');
  await page.keyboard.press('Tab'); await expect(page.locator('.skip-link')).not.toBeFocused();
  await page.setViewportSize({ width: 390, height: 900 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('[data-open-menu]').click();
  const drawer = page.locator('#mobile-navigation'); await expect(drawer).toBeVisible();
  await expect(drawer).toHaveCSS('animation-name', 'none'); await expect(drawer).toHaveCSS('transition-duration', '0s');
  await expect(drawer).toHaveCSS('opacity', '1');
});
