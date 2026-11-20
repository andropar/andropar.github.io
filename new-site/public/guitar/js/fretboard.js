// SVG rendering: the full neck and small chord diagrams.

import { TUNING, pc, noteName, pretty } from "./theory.js";

const NS = "http://www.w3.org/2000/svg";
const FRETS = 15;
const W = 1000;
const NUT_X = 76;
// Real fret spacing: fret n sits at L·(1 − 2^(−n/12)) from the nut.
const L = (W - NUT_X - 10) / (1 - Math.pow(2, -FRETS / 12));
const fretX = (n) => NUT_X + L * (1 - Math.pow(2, -n / 12));
const STR_TOP = 26;
const STR_GAP = 30;
const H = STR_TOP * 2 + STR_GAP * 5 + 18;
// String index 0 = low E; drawn at the bottom like looking down at your own guitar in tab view.
const strY = (s) => STR_TOP + (5 - s) * STR_GAP;
const noteX = (f) => (f === 0 ? NUT_X - 24 : (fretX(f - 1) + fretX(f)) / 2);

const el = (tag, attrs = {}, text) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  return e;
};

/**
 * Draw the neck into `svg`.
 * opts.marks: Map pc → {label, role}  (chord tones / detected notes)
 * opts.faint: Map pc → label          (e.g. scale notes of the key)
 * opts.exact: Set of midi numbers to emphasise (the precise pitch you played)
 * opts.showAll: label every position with its note name
 * opts.onPick(midi, s, f)
 */
export function renderNeck(svg, opts = {}) {
  const { marks = new Map(), faint = new Map(), exact = new Set(), showAll = false, onPick, onlyString = null } = opts;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.replaceChildren();
  svg.appendChild(el("rect", { x: NUT_X, y: STR_TOP - 14, width: fretX(FRETS) - NUT_X, height: STR_GAP * 5 + 28, class: "neck-wood", rx: 3 }));
  // Inlays
  for (const f of [3, 5, 7, 9, 15]) {
    svg.appendChild(el("circle", { cx: noteX(f), cy: STR_TOP + STR_GAP * 2.5, r: 6, class: "inlay" }));
  }
  svg.appendChild(el("circle", { cx: noteX(12), cy: STR_TOP + STR_GAP * 1.5, r: 6, class: "inlay" }));
  svg.appendChild(el("circle", { cx: noteX(12), cy: STR_TOP + STR_GAP * 3.5, r: 6, class: "inlay" }));
  // Frets
  for (let f = 1; f <= FRETS; f++) {
    svg.appendChild(el("line", { x1: fretX(f), x2: fretX(f), y1: STR_TOP - 14, y2: STR_TOP + STR_GAP * 5 + 14, class: "fret" }));
    svg.appendChild(el("text", { x: noteX(f), y: H - 4, class: "fret-num" + ([3, 5, 7, 9, 12, 15].includes(f) ? " strong" : "") }, f));
  }
  svg.appendChild(el("rect", { x: NUT_X - 5, y: STR_TOP - 14, width: 6, height: STR_GAP * 5 + 28, class: "nut" }));
  // Strings (thicker for low strings)
  for (let s = 0; s < 6; s++) {
    svg.appendChild(el("line", { x1: NUT_X - 46, x2: fretX(FRETS), y1: strY(s), y2: strY(s), class: "string", "stroke-width": 2.6 - s * 0.35 }));
    svg.appendChild(el("text", { x: 4, y: strY(s) + 4, class: "string-name" }, ["E", "A", "D", "G", "B", "e"][s]));
  }
  // Notes
  for (let s = 0; s < 6; s++) {
    for (let f = 0; f <= FRETS; f++) {
      const midi = TUNING[s] + f;
      const p = pc(midi);
      const m = onlyString == null || onlyString === s ? marks.get(p) : null;
      const fa = faint.get(p);
      const g = el("g", { class: "pos", "data-midi": midi, tabindex: -1 });
      const x = noteX(f), y = strY(s);
      if (m) {
        g.appendChild(el("circle", { cx: x, cy: y, r: exact.has(midi) ? 13.5 : 11.5, class: `dot role-${m.role}` + (exact.has(midi) ? " exact" : "") }));
        g.appendChild(el("text", { x, y: y + 4, class: "dot-label" }, pretty(m.label)));
      } else if (fa != null) {
        g.appendChild(el("circle", { cx: x, cy: y, r: 9.5, class: "dot faint" }));
        g.appendChild(el("text", { x, y: y + 3.5, class: "dot-label faint-label" }, pretty(fa)));
      } else if (showAll) {
        g.appendChild(el("text", { x, y: y + 4, class: "all-label" }, pretty(noteName(p))));
      }
      // Generous invisible hit area so tapping any position plays it.
      g.appendChild(el("rect", { x: x - 16, y: y - 14, width: 32, height: 28, class: "hit" }));
      if (onPick) g.addEventListener("click", () => onPick(midi, s, f));
      svg.appendChild(g);
    }
  }
}

/** Small vertical chord diagram as an SVG string. Dots are labelled with interval names. */
export function diagramSVG(chord, voicing) {
  const fretted = voicing.frets.filter((f) => f != null && f > 0);
  const maxF = Math.max(0, ...fretted);
  const minF = fretted.length ? Math.min(...fretted) : 1;
  const start = maxF <= 4 ? 1 : minF;
  const rows = 5;
  const w = 150, h = 176, left = 26, top = 34, gapX = (w - left - 14) / 5, gapY = 26;
  let s = `<svg viewBox="0 0 ${w} ${h}" class="diagram" role="img" aria-label="${chord.symbol} ${voicing.label}">`;
  if (start === 1) s += `<rect x="${left - 1}" y="${top - 5}" width="${gapX * 5 + 2}" height="5" class="d-nut"/>`;
  else s += `<text x="${left - 8}" y="${top + gapY / 2 + 4}" class="d-start">${start}</text>`;
  for (let r = 0; r <= rows; r++) s += `<line x1="${left}" x2="${left + gapX * 5}" y1="${top + r * gapY}" y2="${top + r * gapY}" class="d-fret"/>`;
  for (let i = 0; i < 6; i++) s += `<line x1="${left + i * gapX}" x2="${left + i * gapX}" y1="${top}" y2="${top + rows * gapY}" class="d-string"/>`;
  // Barre: same lowest fret on the root string and the high e.
  const barreFret = voicing.frets[5] != null && voicing.frets[5] === minF && minF > 0 && fretted.filter((f) => f === minF).length >= 3 ? minF : null;
  if (barreFret) {
    const first = voicing.frets.findIndex((f) => f === barreFret);
    const y = top + (barreFret - start + 0.5) * gapY;
    s += `<rect x="${left + first * gapX - 9}" y="${y - 9}" width="${(5 - first) * gapX + 18}" height="18" rx="9" class="d-barre"/>`;
  }
  voicing.frets.forEach((f, i) => {
    const x = left + i * gapX;
    if (f == null) s += `<text x="${x}" y="${top - 12}" class="d-xo">×</text>`;
    else {
      const p = pc(voicing.notes[i]);
      const tone = chord.tones.find((t) => t.pc === p);
      const role = tone ? tone.role : "color";
      const label = tone ? pretty(tone.label) : "";
      if (f === 0) s += `<circle cx="${x}" cy="${top - 16}" r="8.5" class="d-open role-${role}"/><text x="${x}" y="${top - 12.8}" class="d-open-label">${label}</text>`;
      else {
        const y = top + (f - start + 0.5) * gapY;
        s += `<circle cx="${x}" cy="${y}" r="10" class="dot role-${role}"/><text x="${x}" y="${y + 4}" class="dot-label small">${label}</text>`;
      }
    }
  });
  s += `</svg>`;
  return s;
}
