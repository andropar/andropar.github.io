// Remark plugin for "A century of fear" (src/content/blog/a-century-of-fear.md).
// The post is ordinary Markdown, editable in the site's editor, with two kinds of slots:
//   {{figure:key}}   a chart, on a line of its own (hero, threats, vocabulary, canon, reach, stories,
//                    geography, signatures)
//   {{cite:id,id}}   a numbered reference, inline; the references list is built from them in order
// A paragraph that starts with "Data:" is the byline under the opening. The paragraphs before the
// first `## heading` form the opening; each heading starts a section. The year picker, references,
// methods and data credits are appended from the essay's data. Links to TMDB are styled as film links.
import { readFileSync } from "node:fs";
import { essayHtml } from "./essay.js";

const DATA = new URL("../../../public/writing/a-century-of-fear/timeline.json", import.meta.url);
const POST = "a-century-of-fear.md";

const html = (value) => ({ type: "html", value });
const text = (node) => (node.children ?? []).map((c) => (c.type === "text" ? c.value : text(c))).join("");

/** The generated parts of the essay, cut out of its full HTML. */
function parts() {
  const full = essayHtml(JSON.parse(readFileSync(DATA, "utf8")));
  const figures = { hero: full.match(/<figure class="tl-hero"[\s\S]*?<\/figure>/)?.[0] };
  for (const [figure, key] of full.matchAll(/<figure class="tl-fig tl-fig-([\w-]+)">[\s\S]*?<\/figure>/g)) figures[key] ??= figure;
  const references = Object.fromEntries([...full.matchAll(/<li id="tl-ref-([\w-]+)">([\s\S]*?)<\/li>/g)].map((m) => [m[1], m[2]]));
  const year = full.match(/<aside class="tl-year">[\s\S]*?<\/aside>/)?.[0] ?? "";
  const methods = full.match(/<section class="tl-methods" id="tl-methods">[\s\S]*<\/section>/)?.[0] ?? "";
  const credits = full.match(/<p class="tl-attrib">[\s\S]*?<\/p>/)?.[0] ?? "";
  return { figures, references, year, methods, credits };
}

export default function remarkCenturyOfFear() {
  let cache = null;
  return (tree, file) => {
    if (!String(file.path ?? "").endsWith(POST)) return;
    cache ??= parts();
    const { figures, references, year, methods, credits } = cache;
    const cited = [];
    const sup = (ids) => `<sup class="tl-cite">${ids.map((id) => {
      if (!references[id]) console.warn(`[century-of-fear] unknown reference ${id}`);
      if (!cited.includes(id)) cited.push(id);
      const n = cited.indexOf(id) + 1;
      return `<a href="#tl-ref-${id}" data-tl-ref aria-label="Reference ${n}">${n}</a>`;
    }).join(",")}</sup>`;

    // Inline slots and link styling, in document order (so references number by first use).
    const inline = (node) => {
      if (!node.children) return;
      node.children = node.children.flatMap((child) => {
        if (child.type === "text" && child.value.includes("{{cite:")) {
          return child.value.split(/(\{\{cite:[\w,\s-]+\}\})/).filter(Boolean).map((piece) => {
            const m = piece.match(/^\{\{cite:([\w,\s-]+)\}\}$/);
            return m ? html(sup(m[1].split(",").map((id) => id.trim()))) : { type: "text", value: piece };
          });
        }
        if (child.type === "link" && /^https?:/.test(child.url)) {
          const film = /themoviedb\.org/.test(child.url);
          child.data = { ...child.data, hProperties: { ...(film ? { className: ["tl-film"] } : {}), target: "_blank", rel: "noopener" } };
        }
        inline(child);
        return [child];
      });
    };
    inline(tree);

    // Block slots and the byline.
    tree.children = tree.children.map((node) => {
      if (node.type !== "paragraph") return node;
      const line = text(node).trim();
      const figure = line.match(/^\{\{figure:([\w-]+)\}\}$/);
      if (figure) {
        if (!figures[figure[1]]) console.warn(`[century-of-fear] unknown figure ${figure[1]}`);
        return html(figures[figure[1]] ?? "");
      }
      if (line.startsWith("Data:")) node.data = { ...node.data, hProperties: { className: ["tl-byline"] } };
      return node;
    });

    // The opening, then one section per heading; the last one closes the essay.
    const out = [];
    const first = tree.children.findIndex((node) => node.type === "heading" && node.depth === 2);
    const headings = tree.children.filter((node) => node.type === "heading" && node.depth === 2);
    out.push(html('<div class="tl-opening">'), ...tree.children.slice(0, first < 0 ? tree.children.length : first), html("</div>"));
    let open = false;
    for (const node of first < 0 ? [] : tree.children.slice(first)) {
      if (node.type === "heading" && node.depth === 2) {
        if (open) out.push(html("</section>"));
        out.push(html(`<section class="tl-section${node === headings.at(-1) ? " tl-close" : ""}">`));
        open = true;
      }
      out.push(node);
    }
    if (open) out.push(html("</section>"));
    const list = cited.length
      ? `<section class="tl-section tl-refs"><h2 class="tl-refs-title">References</h2><ol>${cited.map((id) => `<li id="tl-ref-${id}">${references[id] ?? id}</li>`).join("")}</ol></section>`
      : "";
    tree.children = [...out, html(year), html(list), html(methods), html(credits)];
  };
}
