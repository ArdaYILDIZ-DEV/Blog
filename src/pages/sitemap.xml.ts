import type { APIRoute } from 'astro';
import { getModel } from '../lib/content';
import { languages } from '../lib/i18n';
import { absoluteUrl } from '../lib/urls';

export const GET: APIRoute = async ({ site }) => {
  const model = await getModel();
  const paths = new Map<string, Date | undefined>();
  for (const lang of languages) {
    paths.set(`/${lang}/`, undefined);
    paths.set(`/${lang}/search/`, undefined);
    paths.set(`/${lang}/tags/`, undefined);
  }
  for (const entry of [...model.categories, ...model.tags]) paths.set(entry.path, undefined);
  for (const post of model.posts) paths.set(post.path, post.updated ?? post.date);
  const escape = (value: string) => value.replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[char]!));
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...paths].map(([path, date]) => `<url><loc>${escape(absoluteUrl(path, site!.origin))}</loc>${date ? `<lastmod>${date.toISOString()}</lastmod>` : ''}</url>`).join('')}</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
