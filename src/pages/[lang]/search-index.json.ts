import type { APIRoute, GetStaticPaths } from 'astro';
import { getModel } from '../../lib/content';
import { languages } from '../../lib/i18n';
import { withBase } from '../../lib/urls';

export const getStaticPaths: GetStaticPaths = () => languages.map(lang => ({ params: { lang } }));
export const GET: APIRoute = async ({ params }) => {
  const model = await getModel();
  const entries = model.posts.filter(post => post.lang === params.lang).map(post => ({
    title: post.title, description: post.description,
    body: post.body.replace(/<[^>]*>/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[#*_`~>|]/g, ' ').replace(/\s+/g, ' ').trim(),
    path: withBase(post.path), ...(post.date ? { date: post.date.toISOString() } : {}),
  }));
  return new Response(JSON.stringify(entries), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
