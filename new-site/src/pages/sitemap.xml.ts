import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// The pages search engines should know about: the homepage, the writing index and every listed
// post that has its own page. Drafts, unlisted posts and pieces published elsewhere stay out.
export const GET: APIRoute = async ({ site }) => {
  const posts = (await getCollection('blog')).filter(post => !post.data.draft && !post.data.unlisted && !post.data.link);
  const pages = [
    { path: '/' },
    { path: '/blog/' },
    ...posts.map(post => ({ path: `/blog/${post.slug}/`, lastmod: post.data.date.toISOString().slice(0, 10) })),
  ];
  const urls = pages.map(page => `  <url><loc>${new URL(page.path, site)}</loc>${'lastmod' in page ? `<lastmod>${page.lastmod}</lastmod>` : ''}</url>`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
