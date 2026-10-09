import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';

const site = process.env.SITE_URL || 'http://localhost:4321';
const parsed = new URL(site);
if (!['http:', 'https:'].includes(parsed.protocol) || parsed.pathname !== '/' || parsed.search || parsed.hash) {
  throw new Error('SITE_URL must be an HTTP(S) origin without a path. Set BASE_PATH separately.');
}
const rawBase = process.env.BASE_PATH || '/';
if (!/^\/(?:[A-Za-z0-9._~-]+\/)*[A-Za-z0-9._~-]*\/?$/.test(rawBase) || rawBase.split('/').some((part) => part === '.' || part === '..')) {
  throw new Error('BASE_PATH must be / or an absolute URL path, such as /Blog.');
}

// The native processor adds accessible tables and base-aware links at build time.
const blogMarkdown = {
  name: 'blog-markdown',
  element: {
    filter: ['a', 'th', 'table'],
    visit(node, ctx) {
      if (node.tagName === 'a' && typeof node.properties.href === 'string') {
        const href = node.properties.href;
        const base = rawBase.replace(/\/$/, '');
        if (href.startsWith('/') && !href.startsWith('//') && base && href !== base && !href.startsWith(`${base}/`)) ctx.setProperty(node, 'href', `${base}${href}`);
      }
      if (node.tagName === 'th') ctx.setProperty(node, 'scope', 'col');
      if (node.tagName === 'table') ctx.wrapNode(node, { type: 'element', tagName: 'div', properties: { className: ['table-scroll'], tabIndex: 0, role: 'region', ariaLabel: 'Table / Tablo' }, children: [] });
    },
  },
};
function syntaxTheme(name, type, colors) {
  return {
    name, type, colors: { 'editor.background': type === 'dark' ? '#151515' : '#faf9f5', 'editor.foreground': type === 'dark' ? '#f0efec' : '#1f1e1b' },
    tokenColors: [
      { scope: ['keyword', 'storage'], settings: { foreground: colors[0] } },
      { scope: ['string'], settings: { foreground: colors[1] } },
      { scope: ['constant.numeric'], settings: { foreground: colors[2] } },
      { scope: ['comment'], settings: { foreground: colors[3] } },
    ],
  };
}

export default defineConfig({
  site: parsed.origin,
  base: rawBase,
  trailingSlash: 'always',
  output: 'static',
  prefetch: { defaultStrategy: 'hover' },
  markdown: {
    processor: satteri({ hastPlugins: [blogMarkdown] }),
    shikiConfig: { defaultColor: false, themes: {
      light: syntaxTheme('blog-light', 'light', ['#2a64a8', '#2f7a4a', '#8a5a00', '#6b6962']),
      dark: syntaxTheme('blog-dark', 'dark', ['#6da7ec', '#7fb88a', '#d9a441', '#94928b']),
    } },
  },
});
