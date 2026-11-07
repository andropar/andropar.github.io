// Remark plugin for "The recommendation system behind Horrorverse"
// (src/content/blog/horrorverse-recommender.md). The post is ordinary Markdown, editable in the site's
// editor, with a few slots:
//   {{step:name}}           on a line of its own: starts a section; the interactive figure `name`
//                           sits next to it (klaus, funnel, families, sandbox, bridge, site, home,
//                           newrow, night, fusion, lineup, anon, testing, why, results)
//   {{term:word|tooltip}}   a technical term with a plain-language tooltip
//   {{details:Title}} … {{/details}}   a collapsed block (the maths)
//   ```formula              a monospaced formula
const POST = "horrorverse-recommender.md";

const html = (value) => ({ type: "html", value });
const text = (node) => (node.children ?? []).map((c) => (c.type === "text" ? c.value : text(c))).join("");
const attr = (value) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const escapeHtml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export default function remarkHorrorverse() {
  return (tree, file) => {
    if (!String(file.path ?? "").endsWith(POST)) return;

    // Inline tooltips.
    const inline = (node) => {
      if (!node.children) return;
      node.children = node.children.flatMap((child) => {
        if (child.type === "text" && child.value.includes("{{term:")) {
          return child.value.split(/(\{\{term:[^|}]+\|[^}]+\}\})/).filter(Boolean).map((piece) => {
            const m = piece.match(/^\{\{term:([^|}]+)\|([^}]+)\}\}$/);
            return m
              ? html(`<span class="term" data-tip="${attr(m[2].trim())}">${escapeHtml(m[1].trim())}</span>`)
              : { type: "text", value: piece };
          });
        }
        inline(child);
        return [child];
      });
    };
    inline(tree);

    // Sections, collapsed blocks and formulas.
    const out = [];
    let open = false;
    for (const node of tree.children) {
      const line = node.type === "paragraph" ? text(node).trim() : "";
      const step = line.match(/^\{\{step:([\w-]+)\}\}$/);
      const details = line.match(/^\{\{details:(.+)\}\}$/);
      if (step) {
        if (open) out.push(html("</section>"));
        out.push(html(`<section class="step" data-panel="${step[1]}">`));
        open = true;
      } else if (details) {
        out.push(html(`<details class="deep"><summary>${escapeHtml(details[1].trim())}</summary>`));
      } else if (line === "{{/details}}") {
        out.push(html("</details>"));
      } else if (node.type === "code" && node.lang === "formula") {
        out.push(html(`<div class="formula">${escapeHtml(node.value)}</div>`));
      } else {
        out.push(node);
      }
    }
    if (open) out.push(html("</section>"));
    tree.children = out;
  };
}
