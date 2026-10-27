import type { CollectionEntry } from 'astro:content';
import { readingTime } from './reading-time';

type Post = CollectionEntry<'blog'>;

/** Where a writing entry leads: its article page, or the external page for pieces published elsewhere. */
export const postHref = (post: Post) => post.data.link ?? `/blog/${post.slug}`;

/** Link attributes for a writing entry, opening external pieces in a new tab. */
export const postLinkProps = (post: Post) => (post.data.link ? { href: post.data.link, target: '_blank', rel: 'noopener' } : { href: postHref(post) });

/** The secondary detail for a writing entry: reading time, or where an external piece lives. */
export const postDetail = (post: Post) => (post.data.link ? `On ${new URL(post.data.link).hostname.replace(/^www\./, '')}` : `${readingTime(post.body)} min read`);
