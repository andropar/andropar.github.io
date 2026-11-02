// "A century of fear" is an illustrated essay rendered from data rather than Markdown. Its text is
// built here once, at build time; the charts are drawn in the browser (src/components/CenturyOfFear.astro).
import data from '../../public/writing/a-century-of-fear/timeline.json';
import { essayHtml } from '../scripts/century-of-fear/essay.js';

/** The essay's HTML, without the title and lede that the article header shows. */
export const html: string = essayHtml(data);

/** The essay's sections, for the article's contents list. */
export const headings = [...html.matchAll(/<h2 id="([^"]+)">(.*?)<\/h2>/g)].map(([, slug, text]) => ({ depth: 2, slug, text }));

/** Reading time of the essay's running text (references, the collapsed methods section and chart labels excluded). */
export const minutes = (() => {
  const text = html
    .replace(/<section class="tl-section tl-refs">[\s\S]*?<\/section>/, ' ')
    .replace(/<section class="tl-methods"[\s\S]*?<\/section>/, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ');
  return Math.max(1, Math.ceil(text.split(/\s+/).filter(Boolean).length / 230));
})();
