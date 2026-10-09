import rss from '@astrojs/rss';
import type { APIRoute, GetStaticPaths } from 'astro';
import { getModel } from '../../lib/content';
import { languages, t, type Lang } from '../../lib/i18n';
import { absoluteUrl } from '../../lib/urls';

export const getStaticPaths: GetStaticPaths = () => languages.map(lang => ({ params: { lang } }));
export const GET: APIRoute = async ({ params, site }) => {
  const lang = params.lang as Lang;
  const model = await getModel();
  return rss({
    title: `Arda's Blog — ${lang.toUpperCase()}`, description: t(lang).siteDescription,
    site: absoluteUrl(`/${lang}/`, site!.origin), customData: `<language>${lang}</language>`,
    items: model.posts.filter(post => post.lang === lang && post.date).map(post => ({
      title: post.title, description: post.description, pubDate: post.date!,
      link: absoluteUrl(post.path, site!.origin), categories: post.tags,
    })),
  });
};
