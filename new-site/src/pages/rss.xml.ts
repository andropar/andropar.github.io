import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { postHref } from '../data/posts';

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// The writing feed: every listed post, newest first, with its title, description and link. Pieces
// published elsewhere link to where they live.
export const GET: APIRoute = async ({ site }) => {
  const posts = (await getCollection('blog')).filter(post => !post.data.draft && !post.data.unlisted).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  const items = posts.map(post => {
    const link = new URL(post.data.link ?? `${postHref(post)}/`, site).href;
    return `    <item>\n      <title>${escape(post.data.title)}</title>\n      <link>${escape(link)}</link>\n      <guid isPermaLink="true">${escape(link)}</guid>\n      <pubDate>${post.data.date.toUTCString()}</pubDate>\n      <description>${escape(post.data.description)}</description>\n    </item>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n  <channel>\n    <title>Johannes Roth — Writing</title>\n    <link>${new URL('/blog/', site)}</link>\n    <atom:link href="${new URL('/rss.xml', site)}" rel="self" type="application/rss+xml" />\n    <description>Notes and essays on research, software, and life.</description>\n    <language>en</language>\n${items.join('\n')}\n  </channel>\n</rss>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
