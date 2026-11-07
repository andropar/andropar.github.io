// The interactive figures of "The recommendation system behind Horrorverse": one panel per section,
// shown in a sticky column on wide screens and inline on narrow ones. Built from the essay data file.
export function mountPost(D) {
const P = D.posters;
const FILMS = {};
(function collect(o) { if (Array.isArray(o)) o.forEach(collect); else if (o && typeof o === "object") { if (o.id && o.title) FILMS[o.id] = Object.assign(FILMS[o.id] || {}, o); Object.values(o).forEach(collect); } })(D);
D.sandbox.probes.forEach(p => FILMS[p.id] = Object.assign(FILMS[p.id] || {}, p));
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = n => n.toLocaleString("en-GB");
const short = t => String(t || "").replace(/^The /, "");
const poster = (id, cls = "") => P[id]
  ? `<span class="poster ${cls}" style="background-image:url('${P[id]}')" aria-hidden="true"></span>`
  : `<span class="poster ph ${cls}" aria-hidden="true">${esc(short(FILMS[id]?.title || "?")[0])}</span>`;
const title = id => FILMS[id]?.title || "";
const year = id => FILMS[id]?.year ?? "";

function panel(id, label, body, opts = {}) {
  const el = document.createElement("div");
  el.className = "pn panel";
  el.dataset.id = id;
  el.innerHTML = `<div class="pn-head"><span class="pn-label">${label}</span>${opts.control || ""}</div><div class="pn-body">${body}</div>${opts.foot ? `<p class="pn-foot">${opts.foot}</p>` : ""}`;
  return el;
}
function seg(name, options, current) {
  return `<span class="seg" data-seg="${name}">${options.map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${v === current}">${l}</button>`).join("")}</span>`;
}
function bindSeg(root, name, fn) {
  $$(`[data-seg="${name}"] button`, root).forEach(b => b.onclick = () => {
    $$(`[data-seg="${name}"] button`, root).forEach(x => x.setAttribute("aria-pressed", x === b));
    fn(b.dataset.v);
  });
}


const PANELS = {};
const pct = (v, d = 2) => (v * 100).toFixed(d) + "%";
const signed = (v, d = 3) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(d);
// Selectable items: click/tap or keyboard; hover only previews on pointer devices.
function selectable(root, sel, fn) {
  const hoverable = matchMedia("(hover: hover)").matches;
  $$(sel, root).forEach(b => { b.onclick = () => fn(b); if (hoverable) b.onmouseenter = () => fn(b); });
}
function setSel(root, sel, pred) { $$(sel, root).forEach(b => { const on = pred(b); b.classList.toggle("sel", on); b.setAttribute("aria-pressed", on); }); }
function stepFor(id) { return $(`.step[data-panel="${id}"]`); }

// ---------- 01 Jason ----------
PANELS.klaus = () => {
  const x = s => 4 + (s - 0.5) / 4.5 * 92;
  const state = s => s >= 3.5 ? ["Like", "like"] : s <= 2.5 ? ["Dislike", "dis"] : ["Seen only", "seen"];
  const rows = [...D.likes].sort((a, b) => b.stars - a.stars);
  return panel("klaus", "What Jason’s ratings tell the system", `
    <div class="strip">
      <span class="z dis" style="left:${x(0.5)}%;width:${x(2.5) - x(0.5)}%"></span><span class="z seen" style="left:${x(2.5)}%;width:${x(3.5) - x(2.5)}%"></span><span class="z like" style="left:${x(3.5)}%;width:${x(5) - x(3.5)}%"></span>
      ${rows.map(f => `<span class="dot ${state(f.stars)[1]}" style="left:${x(f.stars)}%" title="${esc(f.title)} · ${f.stars} stars · ${state(f.stars)[0]}"></span>`).join("")}
      <span class="zl" style="left:${(x(0.5) + x(2.5)) / 2}%">Dislike</span><span class="zl" style="left:${x(3)}%">Seen only</span><span class="zl" style="left:${(x(3.5) + x(5)) / 2}%">Like</span>
    </div>
    <div class="krows">${rows.map(f => { const [s, c] = state(f.stars); return `<div class="krow">${poster(f.id)}<span class="kt">${esc(f.title)} <small>${f.year}</small></span><span class="ks">${f.stars} stars</span><span class="tag ${c}">${s}</span></div>`; }).join("")}</div>`,
    { foot: "Ratings of 3.5 stars or more count as likes; 2.5 or less count as dislikes. A 3 keeps the film out of future recommendations." });
};

// ---------- 02 Funnel ----------
const FN = [
  ["Starting catalogue", "The catalogue includes core horror alongside thrillers and sci-fi with a horror streak."],
  ["Classified as horror", "This removes thrillers and sci-fi that fall outside the site’s core horror category."],
  ["With a poster", "Films without posters would leave empty tiles on the page."],
  ["At least 10 TMDB votes", "Ten votes is the lowest bar that keeps noisy ratings out while letting obscure films through."],
  ["At least 45 minutes", "Films with a recorded runtime below 45 minutes drop out here."],
  ["Unrated by Jason", "Jason’s six rated films are removed."],
];
PANELS.funnel = () => {
  const max = D.funnel[0].n;
  const el = panel("funnel", "Which films remain for Jason", `
    <div class="fn-h"><span></span><span></span><span>Films remaining</span><span>Removed here</span></div>
    <div class="fn">${D.funnel.map((s, i) => { const prev = i ? D.funnel[i - 1].n : s.n, rm = prev - s.n;
      return `<button type="button" class="fn-row ${i === D.funnel.length - 1 ? "last" : ""}" data-i="${i}"><span>${FN[i][0]}</span><span class="fn-bar"><i style="width:${(s.n / max * 100).toFixed(1)}%"></i>${rm ? `<u style="left:${(s.n / max * 100).toFixed(1)}%;width:${Math.max(0.6, rm / max * 100).toFixed(1)}%"></u>` : ""}</span><span class="fn-n">${fmt(s.n)}</span><span class="fn-r">${rm ? "−" + fmt(rm) : ""}</span></button>`; }).join("")}</div>
    <div class="keys"><span class="k-solid">Solid: remaining</span><span class="k-hatch">Hatched: removed here</span></div>
    <p class="note" id="fnnote" aria-live="polite"></p>`,
    { foot: "Each row applies another check. Select a row to see what it removes." });
  el._init = () => {
    const show = i => { const rm = i ? D.funnel[i - 1].n - D.funnel[i].n : 0; $("#fnnote", el).innerHTML = `${rm ? `<b>${fmt(rm)} films removed.</b> ` : ""}${FN[i][1]}`; setSel(el, ".fn-row", b => +b.dataset.i === i); };
    selectable(el, ".fn-row", b => show(+b.dataset.i)); show(1);
  };
  return el;
};

// ---------- 03 Three ways to learn (same order as the text: ALS, sequence models, EASE) ----------
const LEFT = ["tmdb:16307", "tmdb:310131", "tmdb:493922", "tmdb:530385", "tmdb:4488"];
const RIGHT = ["tmdb:503919", "tmdb:419430", "tmdb:270303", "tmdb:458723", "tmdb:300668"];
function ideaSvg(k) {
  const W = 600, lx = 150, rx = 450;
  const lab = (t, x, a, y) => `<text x="${x}" y="${y + 4}" text-anchor="${a}" class="svg-l">${esc(t)}</text>`;
  if (k === "als") {
    const H = 140, ys = i => 14 + i * 28, fy = [42, 70, 98];
    return `<svg viewBox="0 0 ${W} ${H}" class="svg" aria-hidden="true">
      ${fy.map(y => `<line x1="${lx + 6}" y1="70" x2="282" y2="${y}" class="svg-w"/>`).join("")}
      ${RIGHT.flatMap((_, i) => fy.map(y => `<line x1="318" y1="${y}" x2="${rx - 6}" y2="${ys(i)}" class="svg-w"/>`)).join("")}
      ${fy.map(y => `<rect x="282" y="${y - 9}" width="36" height="18" rx="4" class="svg-box"/>`).join("")}
      <circle cx="${lx}" cy="70" r="6" fill="var(--accent)"/>${lab("Jason", lx - 12, "end", 70)}
      ${RIGHT.map((id, i) => `<circle cx="${rx}" cy="${ys(i)}" r="4.5" fill="var(--muted)"/>${lab(short(title(id)), rx + 12, "start", ys(i))}`).join("")}
      <text x="300" y="${H - 4}" text-anchor="middle" class="svg-c">Compare the person’s numbers with each film’s</text></svg>`;
  }
  if (k === "order") {
    const H = 92, xs = [60, 165, 270, 375, 480];
    return `<svg viewBox="0 0 ${W} ${H}" class="svg" aria-hidden="true">
      <text x="300" y="12" text-anchor="middle" class="svg-c">Earlier ratings → later ratings</text>
      ${LEFT.map((id, i) => `<rect x="${xs[i] - 48}" y="26" width="96" height="34" rx="6" class="svg-box"/><text x="${xs[i]}" y="47" text-anchor="middle" class="svg-l" font-size="11">${esc(short(title(id)).replace("Rosemary's Baby", "Rosemary's"))}</text>${i < 4 ? `<line x1="${xs[i] + 50}" y1="43" x2="${xs[i + 1] - 52}" y2="43" class="svg-a"/>` : ""}`).join("")}
      <line x1="530" y1="43" x2="550" y2="43" class="svg-a"/><text x="570" y="49" text-anchor="middle" fill="var(--accent)" font-size="17">?</text>
      <text x="300" y="${H - 4}" text-anchor="middle" class="svg-c">Predict the next liked film</text></svg>`;
  }
  const H = 140, ys = i => 14 + i * 28;
  const lines = LEFT.flatMap((a, i) => RIGHT.map((b, j) => { const w = FILMS[b]?.parts?.[a] || 0; return w > 0.003 ? `<line x1="${lx + 5}" y1="${ys(i)}" x2="${rx - 5}" y2="${ys(j)}" stroke="var(--accent)" stroke-opacity=".55" stroke-width="${(0.6 + w / 0.1 * 3.5).toFixed(2)}"/>` : ""; })).join("");
  return `<svg viewBox="0 0 ${W} ${H}" class="svg" aria-hidden="true">${lines}
    ${LEFT.map((id, i) => `${lab(short(title(id)), lx - 12, "end", ys(i))}<circle cx="${lx}" cy="${ys(i)}" r="4.5" fill="var(--ink)"/>`).join("")}
    ${RIGHT.map((id, i) => `<circle cx="${rx}" cy="${ys(i)}" r="4.5" fill="var(--muted)"/>${lab(short(title(id)), rx + 12, "start", ys(i))}`).join("")}
    <text x="300" y="${H - 4}" text-anchor="middle" class="svg-c">Line width: the learned weight</text></svg>`;
}
PANELS.families = () => panel("families", "Three ways to learn from ratings", [
  ["1. Matrix factorization · ALS", "als", "ALS learns latent factors for each person and film; comparing them gives a score."],
  ["2. Predict the next rating · SASRec, HSTU", "order", "These sequential models use rating order. My adaptations also use EASE scores and global statistics."],
  ["3. Item-item model · EASE", "connect", "Each liked film contributes a learned weight to an unseen film’s score."],
].map(([h, k, l]) => `<div class="idea"><div class="idea-name">${h}</div>${ideaSvg(k)}<p class="idea-line">${l}</p></div>`).join(""),
  {});

// ---------- 03 Sandbox (shared rating state, also used by the bridge figure) ----------
const SB = D.sandbox, SBN = SB.cols.length;
const SBR = (() => { const bin = atob(SB.rows), bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); return new Float32Array(bytes.buffer); })();
const PRESETS = {
  klaus: Object.fromEntries(SB.probes.filter(p => p.klaus != null).map(p => [p.id, p.klaus >= 3.5 ? "like" : "dislike"])),
  slasher: { "tmdb:4232": "like", "tmdb:948": "like", "tmdb:30497": "like", "tmdb:9532": "like" },
  asian: { "tmdb:2671": "like", "tmdb:27324": "like", "tmdb:396535": "like" },
  comedy: { "tmdb:747": "like", "tmdb:46838": "like" },
  none: {},
};
const PRESET_LABELS = [["klaus", "Jason"], ["slasher", "Slasher fan"], ["asian", "Asian horror"], ["comedy", "Horror comedy"], ["none", "Clear ratings"]];
let sbState = { ...PRESETS.klaus }, sbSel = null, sbPreset = "klaus";
const listeners = [];
function sbPct(sorted, v) { let lo = 0, hi = sorted.length; while (lo < hi) { const m = (lo + hi) >> 1; sorted[m] < v ? lo = m + 1 : hi = m; } const a = lo; hi = sorted.length; while (lo < hi) { const m = (lo + hi) >> 1; sorted[m] <= v ? lo = m + 1 : hi = m; } return (a + lo) / (2 * sorted.length); }
function sbWeight(p, st = sbState) { const s = st[p.id]; return s === "like" ? 1 : s === "dislike" && p.source === "ease" ? -SB.dislike_weight : 0; }
function sbRaw(st = sbState) { const raw = new Float64Array(SBN); SB.probes.forEach((p, i) => { const w = sbWeight(p, st); if (w) for (let j = 0; j < SBN; j++) raw[j] += w * SBR[i * SBN + j]; }); return raw; }
function setRatings(st, preset) { sbState = { ...st }; sbPreset = preset; sbSel = null; listeners.forEach(fn => fn()); }
function presetSeg() { return seg("preset", PRESET_LABELS, sbPreset); }
function syncPresetSegs() { $$('[data-seg="preset"] button').forEach(b => b.setAttribute("aria-pressed", b.dataset.v === sbPreset)); }

PANELS.sandbox = () => {
  const el = panel("sandbox", "Change a rating and watch the picks move", `
    <div class="presets">${presetSeg()}</div>
    <div class="probes">${SB.probes.map(p => `<div class="probe" data-id="${p.id}">${poster(p.id)}<span class="pt" title="${esc(p.title)} (${p.year})">${esc(short(p.title))}</span><span class="pb"><button type="button" data-r="like" aria-label="Like ${esc(p.title)}">Like</button><button type="button" data-r="dislike" aria-label="Dislike ${esc(p.title)}">Dislike</button></span></div>`).join("")}</div>
    <div class="sb-out"><div><div class="sub-h">Recommended films <span>Percentile (%)</span></div><div id="sbtop"></div></div><div class="sb-detail" id="sbdetail"></div></div>`,
    { foot: "Change a rating, then select a recommendation to see its score. The panel uses the site’s EASE weights. Percentiles compare with all 5,808 scored films, including films you rated; tied scores share a position." });
  const renderProbes = () => $$(".probe", el).forEach(r => { const s = sbState[r.dataset.id]; r.className = "probe " + (s || ""); $$("button", r).forEach(b => b.setAttribute("aria-pressed", b.dataset.r === s)); });
  let prevTop = null;
  const render = () => {
    renderProbes(); syncPresetSegs();
    if (!SB.probes.some(p => sbState[p.id] === "like")) { $("#sbtop", el).innerHTML = `<p class="empty">Add a like to get recommendations here. With no likes, the site ranks films by their TMDB vote count.</p>`; $("#sbdetail", el).innerHTML = ""; return; }
    const raw = sbRaw(), sorted = Float64Array.from(raw).sort();
    const order = Array.from(raw.keys()).sort((a, b) => raw[b] - raw[a]), top = [];
    for (const j of order) { if (SB.cols[j][2] && !sbState[SB.col_ids[j]]) top.push(j); if (top.length === 6) break; }
    if (sbSel == null || !top.includes(sbSel)) sbSel = top[0];
    const mv = j => { if (!prevTop) return ""; const was = prevTop.indexOf(j), now = top.indexOf(j); return was < 0 ? '<span class="mv new">new</span>' : was > now ? `<span class="mv up">▲${was - now}</span>` : was < now ? `<span class="mv down">▼${now - was}</span>` : ""; };
    $("#sbtop", el).innerHTML = top.map((j, k) => `<button type="button" class="rrow ${j === sbSel ? "sel" : ""}" data-j="${j}" aria-pressed="${j === sbSel}"><span class="rk">${k + 1}</span>${poster(SB.col_ids[j])}<span class="rt">${esc(SB.cols[j][0])} <small>${SB.cols[j][1] ?? ""}</small>${mv(j)}</span><span class="rv">${(sbPct(sorted, raw[j]) * 100).toFixed(2)}</span></button>`).join("");
    prevTop = top.slice();
    $$("#sbtop .rrow", el).forEach(b => b.onclick = () => { sbSel = +b.dataset.j; render(); $(`#sbtop .rrow[data-j="${sbSel}"]`, el)?.focus(); });
    const j = sbSel, parts = SB.probes.map((p, i) => ({ p, v: sbWeight(p) * SBR[i * SBN + j] })).filter(x => sbWeight(x.p)).sort((a, b) => b.v - a.v);
    const mx = Math.max(...parts.map(x => Math.abs(x.v)), 1e-6), best = parts.find(x => sbState[x.p.id] === "like" && x.v > 0);
    $("#sbdetail", el).innerHTML = `<div class="dt-h">What contributes to ${esc(SB.cols[j][0])} <small class="muted">(right adds, left subtracts)</small></div>
      <div class="zbars">${parts.map(x => `<div class="zrow"><span class="vn">${esc(short(x.p.title))}</span><span class="zb"><span class="z0"></span><i class="${x.v < 0 ? "neg" : ""}" style="${x.v < 0 ? "right:50%" : "left:50%"};width:${(Math.abs(x.v) / mx * 50).toFixed(1)}%"></i></span><span class="vv">${signed(x.v)}</span></div>`).join("")}</div>
      <div class="kv"><span>Total score</span><b>${raw[j].toFixed(3)}</b><span>Percentile (0–1)</span><b>${sbPct(sorted, raw[j]).toFixed(4)}</b></div>
      ${best ? `<div class="because">Because you liked <b>${esc(best.p.title)}</b></div>` : ""}`;
  };
  el._init = () => {
    $$(".probe button", el).forEach(b => b.onclick = () => { const id = b.closest(".probe").dataset.id; const r = b.dataset.r; const st = { ...sbState }; if (st[id] === r) delete st[id]; else st[id] = r; setRatings(st, null); b.focus(); });
    $$('[data-seg="preset"] button', el).forEach(b => b.onclick = () => setRatings(PRESETS[b.dataset.v], b.dataset.v));
    listeners.push(render); render();
  };
  return el;
};

// ---------- 04 Bridge (follows the sandbox ratings) ----------
PANELS.bridge = () => {
  const f = D.bridge.film, B30 = D.bridge30.neighbours;
  const el = panel("bridge", "How The King Tide borrows a score", `
    <div class="presets">${presetSeg()}</div>
    <div class="bh">${poster(f.id, "big")}<div class="kv" id="brkv"></div></div>
    <div class="sub-h">Each neighbour’s contribution <span>Eight largest contributions, plus the remaining 22</span></div>
    <div id="brrows"></div>
    <div class="keys"><span class="k-r">Right: adds to the score</span><span class="k-l">Left: subtracts from the score</span></div>
    <p class="note" id="brnote" aria-live="polite"></p>`,
    { foot: "The same 30 neighbours are used for every profile. Their scores change with the person’s likes. This figure follows the ratings in the panel above." });
  let brSel = null;
  const render = () => {
    syncPresetSegs();
    const raw = sbRaw(), sorted = Float64Array.from(raw).sort();
    const parts = B30.map(n => ({ ...n, s: raw[n.col], v: n.w * raw[n.col] })), total = parts.reduce((a, p) => a + p.v, 0);
    const top = [...parts].sort((a, c) => Math.abs(c.v) - Math.abs(a.v)).slice(0, 8), rest = parts.filter(p => !top.includes(p)), restV = rest.reduce((a, p) => a + p.v, 0);
    const mx = Math.max(...top.map(p => Math.abs(p.v)), Math.abs(restV), 1e-9);
    if (!brSel || !top.some(p => p.id === brSel)) brSel = top[0].id;
    $("#brkv", el).innerHTML = `<span>Ratings in MovieLens</span><b>None</b><span>Total borrowed score</span><b>${total.toFixed(4)}</b><span>Percentile (0–1)</span><b>${sbPct(sorted, total).toFixed(4)}</b>`;
    const bar = v => `<span class="zb"><span class="z0"></span><i class="${v < 0 ? "neg" : ""}" style="${v < 0 ? "right:50%" : "left:50%"};width:${(Math.abs(v) / mx * 50).toFixed(1)}%"></i></span>`;
    $("#brrows", el).innerHTML = top.map(n => `<button type="button" class="zrow sel-row ${n.id === brSel ? "sel" : ""}" data-id="${n.id}"><span class="vn">${poster(n.id, "xs")}${esc(title(n.id) || SB.cols[n.col][0])}${sbState[n.id] === "like" ? ' <em class="you">Liked in this profile</em>' : ""}</span>${bar(n.v)}<span class="vv">${signed(n.v, 4)}</span></button>`).join("")
      + `<div class="zrow rest"><span class="vn">Other 22 films</span>${bar(restV)}<span class="vv">${signed(restV, 4)}</span></div>`;
    const n = parts.find(p => p.id === brSel);
    $("#brnote", el).textContent = `${title(n.id) || SB.cols[n.col][0]}: similarity weight ${(n.w * 100).toFixed(1)}% × profile score ${n.s.toFixed(3)} = ${signed(n.v, 4)} contributed to the total. Similarity weights across all 30 neighbours sum to 100%; each share of the total also depends on the profile score.`;
    selectable(el, ".sel-row", b => { brSel = b.dataset.id; render(); });
  };
  el._init = () => { $$('[data-seg="preset"] button', el).forEach(b => b.onclick = () => setRatings(PRESETS[b.dataset.v], b.dataset.v)); listeners.push(render); render(); };
  return el;
};

// ---------- 05 The site ----------
PANELS.site = () => {
  const day = D.rotation.days[0].ids;
  const dest = (id, label, note) => `<button type="button" class="dest" data-go="${id}"><span>${label}</span><small>${note}</small></button>`;
  const el = panel("site", "Where Jason sees the recommendations", `
    <div class="sub-h">Daily picks · the first three</div>
    <div class="mock-top">${day.slice(0, 3).map(id => `<div class="mock-tile">${poster(id)}<span class="st">${esc(title(id))}</span></div>`).join("")}</div>
    <div class="sub-h" style="margin-top:var(--space-4)">More for you <span>Three more from today’s draw</span></div>
    <div class="mock-row">${day.slice(3).map(id => `<div class="mock-tile">${poster(id)}<span class="st">${esc(title(id))}</span></div>`).join("")}</div>
    <div class="dests">${dest("newrow", "New releases", "Ranked by borrowed scores")}${dest("newrow", "Browse lists", "The same ranking for everyone")}${dest("night", "Movie night", "Films that fit the request, ranked with Jason’s taste")}</div>`,
    { foot: "Jason’s picks for 3 November. Select a section label to see how its films are chosen." });
  el._init = () => $$(".dest", el).forEach(b => b.onclick = () => stepFor(b.dataset.go)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
  return el;
};

// ---------- 05 Home ----------
let dayIdx = 0, poolSel = null;
PANELS.home = () => {
  const pool = D.rotation.pool;
  const el = panel("home", "Daily picks: three fixed, three drawn each day", `
    <div class="days">${D.rotation.days.map((d, i) => { const dt = new Date(d.day + "T12:00:00Z"); return `<button type="button" data-i="${i}" aria-pressed="${i === dayIdx}" aria-label="Show picks for ${dt.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}"><span class="w">${dt.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })}</span><span class="d">${dt.getUTCDate()}</span></button>`; }).join("")}</div>
    <div class="six" id="six"></div>
    <div class="sub-h">The 24 films the draw starts from <span id="drawn"></span></div>
    <div class="pool" id="pool"></div>
    <div class="keys"><span class="k-ink">Top three, kept each day</span><span class="k-acc">Drawn for this day</span></div>
    <p class="note" id="poolnote" aria-live="polite"></p>`,
    { foot: "Select a day to change the draw. These are first visits on separate days; return visits also skip recently shown films." });
  el._init = () => {
    const weights = pool.map((_, i) => Math.exp(-(i + 1) / 6)), wmax = weights[3];
    const render = () => {
      const ids = D.rotation.days[dayIdx].ids, chosen = new Set(ids);
      $("#six", el).innerHTML = ids.map((id, i) => `<div class="six-t ${i < 3 ? "fixed" : "drawn"}">${poster(id)}<span class="rb">#${pool.indexOf(id) + 1}</span><span class="st">${esc(title(id))}</span></div>`).join("");
      $("#pool", el).innerHTML = pool.map((id, i) => `<button type="button" class="pool-t ${i < 3 ? "fixed" : chosen.has(id) ? "drawn" : "off"} ${poolSel === i ? "sel" : ""}" data-i="${i}" aria-label="${esc(title(id))}, rank ${i + 1}">${poster(id)}<span class="pr">${i + 1}</span></button>`).join("");
      $("#drawn", el).textContent = `${new Set(D.rotation.days.flatMap(d => d.ids.slice(3))).size} different films appeared in the three changing slots`;
      const i = poolSel ?? 3, id = pool[i];
      $("#poolnote", el).innerHTML = `<b>${esc(title(id))}</b> · rank ${i + 1} · ${chosen.has(id) ? "shown today" : "outside today’s six"}${i >= 3 ? `<span class="wbar"><span>Relative weight in the draw</span><i style="width:${(weights[i] / wmax * 100).toFixed(0)}%"></i></span>` : ""}<br><small>Higher-ranked films get more weight when the three changing slots are drawn.</small>`;
      selectable(el, ".pool-t", b => { poolSel = +b.dataset.i; render(); });
    };
    $$(".days button", el).forEach(b => b.onclick = () => { dayIdx = +b.dataset.i; $$(".days button", el).forEach(x => x.setAttribute("aria-pressed", x === b)); render(); });
    render();
  };
  return el;
};

// ---------- 05 New releases ----------
let nrSel = 0;
PANELS.newrow = () => {
  const el = panel("newrow", "New releases, ordered for Jason", `<div class="grid5">${D.new_row.map((f, i) => `<button type="button" class="gt nr" data-i="${i}">${poster(f.id)}<span class="nrk">#${i + 1}</span><span class="st">${esc(f.title)}</span><span class="sm">${f.year}</span></button>`).join("")}</div>
    <p class="note" id="nrnote" aria-live="polite"></p>
    <details class="mini"><summary>Which films qualify?</summary><p>Core horror with a poster, at least 45 minutes long, released within the last twelve months, with at least 10 TMDB votes and a TMDB rating of 5.5 or more. Films already rated or seen stay out.</p></details>`,
    { foot: "Select a film to see its TMDB rating and vote count." });
  el._init = () => {
    const show = i => { nrSel = i; const f = D.new_row[i]; $("#nrnote", el).innerHTML = `<b>${esc(f.title)}</b> · TMDB rating: ${f.rating}/10 · ${fmt(f.votes)} votes`; setSel(el, ".nr", b => +b.dataset.i === i); };
    selectable(el, ".nr", b => show(+b.dataset.i)); show(0);
  };
  return el;
};

// ---------- 05 Movie night ----------
const NC = D.night.candidates, W = { sem: .35, lex: .20, fac: .15, qual: .30 };
let nSel = 0;
PANELS.night = () => {
  const top = NC.slice(0, 10), max = Math.max(...top.map(c => c.score));
  const el = panel("night", "Which films fit Jason’s request?", `
    <div class="request">“slow-burn <mark>folk horror</mark>, <mark class="neg">not American</mark>”</div>
    <div class="chips"><span class="chip">US films removed</span><span class="chip">Missing the folk-horror tag: subtract 0.10</span><span class="chip">${fmt(D.night.eligible)} films remain after filtering</span></div>
    <div class="sub-h" style="margin-top:var(--space-4)">The ten highest request scores</div>
    ${top.map((c, i) => `<button type="button" class="vrow nb nrow" data-i="${i}"><span class="vn">${poster(c.id, "xs")}${esc(c.title)} <small>${c.year}</small></span><span class="vb"><i style="width:${(c.score / max * 100).toFixed(1)}%"></i></span><span class="vv">${c.score.toFixed(3)}</span></button>`).join("")}
    <div class="calc" id="ncalc" aria-live="polite"></div>
    <details class="mini"><summary>Other requests</summary><p>Requests beyond genre words give Meaning 0.40, Words 0.35, Facets 0.15 and Quality 0.10.</p></details>`,
    { foot: "For this request, which consists of genre words, Quality gets more weight. The 80 films with the highest request scores go through to the next step." });
  el._init = () => {
    const show = i => { nSel = i; const c = top[i];
      const parts = [["Meaning", W.sem, c.semantic_norm], ["Words", W.lex, c.lexical], ["Facets", W.fac, c.facet], ["Quality", W.qual, c.quality]];
      const sum = parts.reduce((a, [, w, v]) => a + w * v, 0), adj = c.score - sum;
      $("#ncalc", el).innerHTML = `<div class="dt-h">${esc(c.title)}</div>${parts.map(([k, w, v]) => `<div class="cl"><span>${k} × ${w.toFixed(2)}</span><span>${v.toFixed(2)} × ${w.toFixed(2)}</span><b>${(w * v).toFixed(3)}</b></div>`).join("")}
        <div class="cl t"><span>Weighted total</span><span></span><b>${sum.toFixed(3)}</b></div><div class="cl"><span>Adjustment</span><span></span><b>${signed(Math.abs(adj) < 5e-4 ? 0 : adj)}</b></div><div class="cl t"><span>Final request score</span><span></span><b>${c.score.toFixed(3)}</b></div>`;
      setSel(el, ".nrow", b => +b.dataset.i === i); };
    selectable(el, ".nrow", b => show(+b.dataset.i)); show(0);
  };
  return el;
};

// ---------- 05 Fusion ----------
function midrank(values) { const s = [...values].sort((a, b) => a - b), n = values.length; const lo = v => { let a = 0, b = n; while (a < b) { const m = (a + b) >> 1; s[m] < v ? a = m + 1 : b = m; } return a; }; const hi = v => { let a = 0, b = n; while (a < b) { const m = (a + b) >> 1; s[m] <= v ? a = m + 1 : b = m; } return a; }; return values.map(v => n - (lo(v) + hi(v)) / 2 + 0.5); }
function fuse(share) { const rq = midrank(NC.map(c => c.score)), pf = midrank(NC.map(c => c.personal)); return NC.map((c, i) => ({ c, rr: rq[i], pr: pf[i], blend: 61 * ((1 - share) / (60 + rq[i]) + share / (60 + pf[i])) })).sort((a, b) => b.blend - a.blend || a.rr - b.rr); }
const rk = r => Number.isInteger(r) ? String(r) : r.toFixed(1);
let share = 0.5, fzSel = null;
PANELS.fusion = () => {
  const el = panel("fusion", "How Jason’s taste changes the order", `
    <div class="slider"><span>Request only</span><input id="share" type="range" min="0" max="1" step="0.05" value="${share}" aria-label="How much weight to give Jason’s taste"><span>Taste only</span></div>
    <div class="slider-out"><output id="shareout"></output><button type="button" class="linkbtn" id="fzreset">Reset to 50/50</button></div>
    <div class="fz-h"><span>Position</span><span></span><span>Film</span><span>Request rank</span><span>Taste rank</span><span>Movement</span></div>
    <div id="fz"></div>
    <p class="note" id="fznote" aria-live="polite"></p>`,
    { foot: "The site gives request and taste equal weight. Kwaidan stays visible as you move the slider. Ranks are calculated within these 80 films; tied scores share a rank." });
  el._init = () => {
    const reqOrder = fuse(0).map(r => r.c.id);
    const render = () => {
      const rows = fuse(share);
      $("#shareout", el).textContent = `${Math.round((1 - share) * 100)}% request · ${Math.round(share * 100)}% taste${Math.abs(share - 0.5) < 1e-9 ? " · site setting" : ""}`;
      const show = rows.slice(0, 10).map((r, i) => [r, i]); const cas = rows.findIndex(r => r.c.title === "Kwaidan");
      if (cas >= 10) show.push(null, [rows[cas], cas]);
      $("#fz", el).innerHTML = show.map(x => { if (!x) return `<div class="fz gap">⋯</div>`; const [r, i] = x, mv = reqOrder.indexOf(r.c.id) - i;
        return `<button type="button" class="fz ${r.c.title === "Kwaidan" ? "hl" : ""} ${fzSel === r.c.id ? "sel" : ""}" data-id="${r.c.id}"><span class="rk">${i + 1}</span>${poster(r.c.id, "xs")}<span class="vn">${esc(r.c.title)}</span><span class="fv">${rk(r.rr)}</span><span class="fv">${rk(r.pr)}</span><span class="fv ${mv > 0 ? "up" : mv < 0 ? "down" : ""}">${mv > 0 ? "▲" + mv : mv < 0 ? "▼" + -mv : "–"}</span></button>`; }).join("");
      const id = fzSel || rows[cas]?.c.id, pos = rows.findIndex(r => r.c.id === id), mv = reqOrder.indexOf(id) - pos;
      $("#fznote", el).textContent = `${title(id) || NC.find(c => c.id === id).title} moved ${Math.abs(mv)} places ${mv >= 0 ? "up" : "down"} from the request-only order.`;
      selectable(el, ".fz[data-id]", b => { fzSel = b.dataset.id; render(); });
    };
    $("#share", el).oninput = e => { share = +e.target.value; render(); };
    $("#fzreset", el).onclick = () => { share = 0.5; $("#share", el).value = 0.5; render(); };
    render();
  };
  return el;
};

// ---------- 05 Lineup (Jason's trace, one scale for all rounds) ----------
PANELS.lineup = () => {
  const mx = D.night.trace[0][0].blend;
  const el = panel("lineup", "Choosing three films with MMR-style diversification", `
    <div class="rounds">${D.night.trace.map((round, ri) => `<div class="round"><div class="sub-h">Pick ${ri + 1} <span>${ri ? "After penalties for overlap with " + D.night.trace.slice(0, ri).map(r => esc(title(r[0].id))).join(" and ") : "No films chosen yet"}</span></div>
      ${round.slice(0, 3).map((r, i) => `<button type="button" class="vrow nb lrow ${i === 0 ? "win" : ""}" data-r="${ri}" data-k="${i}"><span class="vn">${poster(r.id, "xs")}${esc(title(r.id))}</span><span class="vb lb"><i style="width:${(r.net / mx * 100).toFixed(1)}%"></i><u style="left:${(r.net / mx * 100).toFixed(1)}%;width:${((r.blend - r.net) / mx * 100).toFixed(1)}%"></u></span><span class="vv">${r.net.toFixed(3)}</span></button>`).join("")}</div>`).join("")}</div>
    <div class="keys"><span class="k-acc">Solid: score remaining</span><span class="k-hatch">Hatched: score removed</span></div>
    <p class="note" id="lnote" aria-live="polite"></p>
    <div class="sub-h" style="margin-top:var(--space-3)">Jason’s three picks</div><div class="picked">${D.night.picks.map((id, i) => `<div class="pk">${poster(id)}<span class="sm">${["First pick", "Second pick", "Third pick"][i]}</span><span class="st">${esc(title(id))}</span></div>`).join("")}</div>`,
    { foot: "For this request, the penalties leave the top three in the same order." });
  el._init = () => {
    const show = (ri, k) => { const r = D.night.trace[ri][k]; $("#lnote", el).textContent = `${title(r.id)}: ${r.blend.toFixed(3)} before penalties − ${(r.blend - r.net).toFixed(3)} = ${r.net.toFixed(3)}.`; setSel(el, ".lrow", b => +b.dataset.r === ri && +b.dataset.k === k); };
    selectable(el, ".lrow", b => show(+b.dataset.r, +b.dataset.k)); show(1, 0);
  };
  return el;
};

// ---------- 06 No likes yet ----------
PANELS.anon = () => {
  const card = (f, i, g) => `<button type="button" class="gt an" data-g="${g}" data-i="${i}">${poster(f.id)}<span class="nrk">#${i + 1}</span><span class="st">${esc(f.title)}</span></button>`;
  const el = panel("anon", "What changes after the first like", `
    <div class="sub-h">With Jason’s ratings</div><div class="grid6">${D.pool.slice(0, 6).map((f, i) => card(f, i, "k")).join("")}</div>
    <div class="sub-h" style="margin-top:var(--space-4)">With no likes yet</div><div class="grid6">${D.anonymous.slice(0, 6).map((f, i) => card(f, i, "a")).join("")}</div>
    <p class="note" id="annote" aria-live="polite"></p>
    <p class="note">The same fallback applies when someone has entered only dislikes.</p>`,
    { foot: "These are the top six before the daily draw. With no likes, the site ranks films by their TMDB vote count." });
  el._init = () => {
    const show = (g, i) => { const f = (g === "k" ? D.pool : D.anonymous)[i]; $("#annote", el).innerHTML = `<b>${esc(f.title)}</b> (${f.year}) · ${fmt(f.votes)} TMDB votes`; setSel(el, ".an", b => b.dataset.g === g && +b.dataset.i === i); };
    selectable(el, ".an", b => show(b.dataset.g, +b.dataset.i)); show("a", 5);
  };
  return el;
};

// ---------- 07 Replay ----------
let rpIdx = 0;
const credit = r => r <= 6 ? 1 / Math.log2(r + 1) : 0;
const gapText = h => h < 1 / 60 ? `${Math.max(1, Math.round(h * 3600))} seconds` : h < 1 ? `${Math.round(h * 60)} minutes` : `${Math.round(h)} hours`;
PANELS.testing = () => {
  const label = (r, name) => `${name} · ${r.gap_hours > 1 ? "session start" : "within a session"}`;
  const el = panel("testing", "Could the system find their next like?", `<div id="rp"></div>
    <div class="sub-h" style="margin-top:var(--space-4)">Credit for finding the next like</div>
    <div class="credit">${[1, 2, 3, 4, 5, 6, 7].map(r => `<div class="cr" data-r="${r}"><span class="crb"><i style="height:${(credit(r) * 100).toFixed(0)}%"></i></span><span class="crn">${r < 7 ? r : "7+"}</span><span class="crv">${credit(r).toFixed(2)}</span></div>`).join("")}</div>
    <p class="note">First place earns 1. Lower places earn less, and positions below sixth earn 0. Averaging this credit across test cases gives NDCG@6.</p>`,
    { control: seg("rp", [["0", label(D.replay[0], "Argento fan")], ["1", label(D.replay[1], "The Chaser")]], "0"), foot: "Two MovieLens histories from 2023. Each model ranks the hidden film using the person’s earlier ratings; eight earlier likes are shown here." });
  el._init = () => {
    const render = () => {
      const r = D.replay[rpIdx], t = r.target, inSix = n => n <= 6;
      const status = n => inSix(n) ? `In the top six · credit ${credit(n).toFixed(2)}` : "Outside the top six · credit 0";
      $("#rp", el).innerHTML = `
        <div class="sub-h">Their last eight likes <span>${r.n_likes} earlier likes in total</span></div>
        <div class="rp-likes">${r.likes.map(l => `<div class="gt">${poster(l.id)}<span class="st">${esc(l.title)}</span></div>`).join("")}</div>
        <div class="rp-next"><div>${poster(t.id)}</div><div><div class="sub-h">The next like, hidden during scoring</div><div class="rp-name">${esc(t.title)} <small>${t.year}</small></div>
          <div class="rp-when">Entered ${gapText(r.gap_hours)} after the previous rating. ${r.gap_hours > 1 ? "This counts as a session start." : "This is within the same session."}</div>
          <div class="slots">${[1, 2, 3, 4, 5, 6].map(n => `<span class="${n === r.ease_rank ? "hit" : ""}">${n === r.ease_rank ? poster(t.id) : n}</span>`).join("")}</div>
          <div class="rp-ranks"><div class="${inSix(r.ease_rank) ? "hit" : ""}"><b>#${r.ease_rank}</b><span>EASE</span><em>${status(r.ease_rank)}</em></div><div class="${inSix(r.pop_rank) ? "hit" : ""}"><b>#${fmt(r.pop_rank)}</b><span>Popularity ranking</span><em>${status(r.pop_rank)}</em></div></div></div></div>`;
      $$(".cr", el).forEach(c => c.classList.toggle("on", +c.dataset.r === Math.min(7, r.ease_rank)));
    };
    bindSeg(el, "rp", v => { rpIdx = +v; render(); }); render();
  };
  return el;
};

// ---------- 07 Model comparison: differences from EASE ----------
const EASE_V = 0.2411;
const FAM = [
  { k: "SASRec", d: "Adapted hybrid: rating order + EASE", v: 0.2466, ci: [-0.0051, 0.0163] },
  { k: "HSTU", d: "Adapted hybrid: rating order + EASE", v: 0.2453, ci: [-0.0065, 0.0150] },
  { k: "EASE", d: "Item-item weights", v: EASE_V, base: true },
  { k: "Two tower", d: "Neural network", v: 0.2255, ci: [-0.0251, -0.0062] },
  { k: "ALS", d: "Matrix factorization", v: 0.2197, ci: [-0.0283, -0.0145] },
  { k: "MLP", d: "Neural network", v: 0.2174, ci: [-0.0311, -0.0162] },
  { k: "Wukong", d: "Neural network", v: 0.2126, ci: [-0.0373, -0.0197] },
];
PANELS.why = () => {
  const lo = -0.045, hi = 0.025, x = v => ((v - lo) / (hi - lo) * 100);
  const el = panel("why", "How the models compared with EASE", `
    <div class="dp-h"><span></span><span class="ax"><span>−0.04</span><span>Difference in NDCG@6 from EASE</span><span>+0.02</span></span><span>NDCG@6</span></div>
    ${FAM.map((r, i) => `<button type="button" class="dp ${r.base ? "base" : ""}" data-i="${i}"><span class="cn"><b>${r.k}</b><small>${r.d}</small></span><span class="dt"><span class="z0" style="left:${x(0)}%"></span>${r.base ? `<span class="pt" style="left:${x(0)}%"></span>` : `<s style="left:${x(r.ci[0])}%;width:${x(r.ci[1]) - x(r.ci[0])}%"></s><span class="pt" style="left:${x(r.v - EASE_V)}%"></span>`}</span><span class="cv">${r.v.toFixed(3)}</span></button>`).join("")}
    <div class="dp off"><span class="cn"><b>OneRec-Think</b><small>Fine-tuned Qwen</small></span><span class="dt-text">NDCG@6 0.044. An uncertainty interval is unavailable in this figure.</span><span class="cv">0.044</span></div>
    <div class="keys"><span class="k-pt">Point: estimated difference</span><span class="k-ln">Line: 95% bootstrap confidence interval</span></div>
    <p class="note" id="whynote" aria-live="polite"></p>`,
    { foot: "Best tested setup from each family on the 2019 validation replay, using the older 6,484-film catalogue. Lines show 95% bootstrap confidence intervals for the difference from EASE. The SASRec and HSTU intervals extend to both sides of zero." });
  el._init = () => {
    const show = i => { const r = FAM[i]; $("#whynote", el).textContent = r.base ? `EASE: NDCG@6 ${r.v.toFixed(3)}. Every other model is compared with this.` : `${r.k}: NDCG@6 ${r.v.toFixed(3)}; difference from EASE ${signed(r.v - EASE_V, 4)}; 95% interval ${signed(r.ci[0], 4)} to ${signed(r.ci[1], 4)}.`; setSel(el, ".dp[data-i]", b => +b.dataset.i === i); };
    selectable(el, ".dp[data-i]", b => show(+b.dataset.i)); show(0);
  };
  return el;
};

// ---------- 07 Results ----------
PANELS.results = () => {
  const bar = (k, v, cur, extra = "") => `<div class="fam ${cur ? "base" : ""}"><span class="cn"><b>${k}</b></span><span class="fb">${v === 0 ? `<span class="zero"></span>` : `<i style="width:${(v / 0.22 * 100).toFixed(1)}%"></i>`}</span><span class="cv">${v.toFixed(3)}</span></div>${extra}`;
  return panel("results", "Replay scores before and after the rebuild", `
    <div class="rg"><div class="sub-h">With rating histories</div>${bar("Old system · older catalogue", 0.208)}<div class="pair">${bar("New system · top six", 0.205)}${bar("New system · daily rotation", 0.196, true)}<span class="ann">Daily rotation: 0.205 → 0.196</span></div></div>
    <div class="rg"><div class="sub-h">With no ratings supplied</div>${bar("Average rating · old", 0.069)}${bar("TMDB vote count · new", 0.113, true)}</div>
    <div class="rg"><div class="sub-h">New releases</div>${bar("Random order · old", 0)}${bar("Borrowed scores · new", 0.050, true)}</div>
    <div class="axis-l">NDCG@6 · higher is better</div>
    <div class="keys"><span class="k-acc">Green: used on the site today</span></div>`,
    { foot: "The evaluation used 10,643 held-out likes from 1,140 people in 2023. The old system also used an older catalogue, so that comparison changes both the system and its candidate films." });
};
// ---------- technical terms: <span class="term" data-tip="..."> ----------
(() => {
  const tip = document.createElement("div");
  tip.className = "term-tip"; tip.setAttribute("role", "tooltip"); tip.id = "term-tip";
  document.body.appendChild(tip);
  let current = null, shownAt = 0;
  const show = el => {
    current = el; shownAt = performance.now();
    tip.innerHTML = `<b>${esc(el.dataset.term || el.textContent.trim())}</b>${esc(el.dataset.tip)}`;
    tip.classList.add("on"); el.setAttribute("aria-expanded", "true");
    const r = el.getBoundingClientRect(), t = tip.getBoundingClientRect(), pad = 16;
    const left = Math.min(Math.max(pad, r.left + r.width / 2 - t.width / 2), innerWidth - t.width - pad);
    const above = r.top - t.height - 8, top = above > 64 ? above : r.bottom + 8;
    tip.style.left = left + "px"; tip.style.top = top + "px";
  };
  const hide = () => { if (current) current.setAttribute("aria-expanded", "false"); current = null; tip.classList.remove("on"); };
  for (const el of $$(".term[data-tip]")) {
    el.tabIndex = 0; el.setAttribute("aria-describedby", "term-tip"); el.setAttribute("aria-expanded", "false");
    el.addEventListener("mouseenter", () => show(el));
    el.addEventListener("mouseleave", hide);
    el.addEventListener("focus", () => show(el));
    el.addEventListener("blur", hide);
    // A tap focuses (shows) and then clicks: only a later tap closes it.
    el.addEventListener("click", e => { e.preventDefault(); current === el && performance.now() - shownAt > 300 ? hide() : show(el); });
  }
  addEventListener("scroll", hide, { passive: true });
  addEventListener("keydown", e => { if (e.key === "Escape") hide(); });
})();

// ---------- mounting and scroll sync ----------
const NODES = {};
const steps = $$(".step[data-panel]");
for (const s of steps) { const id = s.dataset.panel; if (!NODES[id]) NODES[id] = PANELS[id](); }
const wide = matchMedia("(min-width: 1100px)");
let active = null;
function activate(id, force) {
  if (!wide.matches || (!force && id === active)) return;
  active = id;
  Object.values(NODES).forEach(n => n.hidden = n.dataset.id !== id);
}
function place() {
  for (const s of steps) { const n = NODES[s.dataset.panel]; if (wide.matches) { $("#sticky").appendChild(n); n.hidden = true; } else { s.appendChild(n); n.hidden = false; } }
  if (wide.matches) activate(active || steps[0].dataset.panel, true);
}
place();
Object.values(NODES).forEach(n => n._init?.());
wide.addEventListener?.("change", place);
// The panel follows the last section whose start has passed the reading line.
function sync() {
  if (!wide.matches) return;
  const line = innerHeight * 0.45;
  let pick = steps[0];
  for (const s of steps) { if (s.getBoundingClientRect().top <= line) pick = s; else break; }
  activate(pick.dataset.panel);
}
addEventListener("scroll", sync, { passive: true });
addEventListener("resize", sync);
setInterval(sync, 250); // catches jumps that fire no scroll event (anchors, restored scroll)
sync();
}
