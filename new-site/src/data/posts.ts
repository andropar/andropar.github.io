import type { CollectionEntry } from 'astro:content';
import { readingTime } from './reading-time';
import { minutes as centuryOfFearMinutes } from './century-of-fear';

type Post = CollectionEntry<'blog'>;

/** Where a writing entry leads: its article page, or the external page for pieces published elsewhere. */
export const postHref = (post: Post) => post.data.link ?? `/blog/${post.slug}`;

/** Link attributes for a writing entry, opening external pieces in a new tab. */
export const postLinkProps = (post: Post) => (post.data.link ? { href: post.data.link, target: '_blank', rel: 'noopener' } : { href: postHref(post) });

// Posts whose article is a component rather than Markdown, with reading times from their rendered text.
const COMPONENT_MINUTES: Record<string, number> = { 'a-century-of-fear': centuryOfFearMinutes };

/** Minutes to read a post. */
export const postMinutes = (post: Post) => COMPONENT_MINUTES[post.slug] ?? readingTime(post.body);

/** The secondary detail for a writing entry: reading time, or where an external piece lives. */
export const postDetail = (post: Post) => (post.data.link ? `On ${new URL(post.data.link).hostname.replace(/^www\./, '')}` : `${postMinutes(post)} min read`);
