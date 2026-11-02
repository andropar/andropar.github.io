// "A century of fear": what horror films were about, year by year, as an illustrated essay
// with a methods foldout. Ported from Horrorverse's timeline page.
//
// `essayHtml(data)` builds the article text (run at build time, so the prose is static HTML);
// `mountEssay(root, data)` draws the charts into it in the browser and wires up the
// tooltips, the year picker, the family and theme selection and the methods foldout.
// The data is public/writing/a-century-of-fear/timeline.json, made by
// scripts/century_of_fear_data.py; its `tmdb` map gives each film's TMDB id.

const POSTER = "https://image.tmdb.org/t/p/w92";
const POSTER_STRIP = "https://image.tmdb.org/t/p/w185";
const TMDB_MOVIE = "https://www.themoviedb.org/movie/";
const HORRORVERSE = "https://horrorverse.jroth.space/";
// Chart colours are CSS custom properties (src/styles/century-of-fear.css), so they follow the theme.
const ACCENT = "var(--accent)";
const SECOND = "var(--cof-second)";
const THREAT_COLORS = {
  supernatural: "var(--cof-supernatural)",
  human: "var(--cof-human)",
  science: "var(--cof-science)",
  nature: "var(--cof-nature)",
};

// Works the article cites, numbered in order of first citation.
const REFERENCES = {
  tudor: "Andrew Tudor, <em>Monsters and Mad Scientists: A Cultural History of the Horror Movie</em> (Oxford: Blackwell, 1989).",
  skal: "David J. Skal, <em>The Monster Show: A Cultural History of Horror</em> (New York: Norton, 1993).",
  phillips: "Kendall R. Phillips, <em>Projected Fears: Horror Films and American Culture</em> (Westport: Praeger, 2005).",
  wood: "Robin Wood, ‘An Introduction to the American Horror Film’, in Robin Wood and Richard Lippe (eds), <em>The American Nightmare</em> (Toronto: Festival of Festivals, 1979).",
  nowell: "Richard Nowell, <em>Blood Money: A History of the First Teen Slasher Film Cycle</em> (New York: Continuum, 2011).",
  clover: "Carol J. Clover, <em>Men, Women, and Chain Saws: Gender in the Modern Horror Film</em> (Princeton: Princeton University Press, 1992).",
  mcroy: "Jay McRoy, <em>Nightmare Japan: Contemporary Japanese Horror Cinema</em> (Amsterdam: Rodopi, 2008).",
  church: "David Church, <em>Post-Horror: Art, Genre and Cultural Elevation</em> (Edinburgh: Edinburgh University Press, 2021).",
  edelstein: "David Edelstein, ‘Now Playing at Your Local Multiplex: Torture Porn’, <em>New York</em> magazine, 2006.",
  wetmore: "Kevin J. Wetmore, <em>Post-9/11 Horror in American Cinema</em> (New York: Continuum, 2012).",
  hutchings: "Peter Hutchings, <em>Hammer and Beyond: The British Horror Film</em> (Manchester: Manchester University Press, 1993).",
  koven: "Mikel J. Koven, <em>La Dolce Morte: Vernacular Cinema and the Italian Giallo Film</em> (Lanham: Scarecrow Press, 2006).",
};

// Eras that film historians tie to horror's subjects, drawn over the threat chart.
const ERAS = [
  { from: 1931, to: 1936, label: "Universal’s monsters", short: "Universal", film: "Dracula", source: "Skal 1993" },
  { from: 1939, to: 1945, label: "Second World War", short: "WWII", film: "Cat People", source: "Skal 1993" },
  { from: 1950, to: 1962, label: "Atomic age", short: "Atomic age", film: "Them!", source: "Skal 1993" },
  { from: 1968, to: 1977, label: "Vietnam and Watergate", short: "Vietnam", film: "Night of the Living Dead", source: "Wood 1979" },
  { from: 1978, to: 1986, label: "Slasher boom", short: "Slashers", film: "Halloween", source: "Clover 1992" },
  { from: 1998, to: 2006, label: "J-horror wave", short: "J-horror", film: "Ringu", source: "McRoy 2008" },
  { from: 2003, to: 2010, label: "After 9/11", short: "9/11", film: "Saw", source: "Wetmore 2012" },
];

// Page state, kept across chart redraws.
let data = null;
// undefined until first mount: phones start with no family open.
let selectedFamily;
let selectedBand = null;
let showAllFranchises = false;
let selectedYear = 1990;

const esc = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const smooth = () => (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");

// Films link to their TMDB page in a new tab; films without a TMDB id are not links.
const tmdbUrl = (d, id) => (d.tmdb?.[id] ? `${TMDB_MOVIE}${d.tmdb[id]}` : null);
const external = (url) => `href="${url}" target="_blank" rel="noopener"`;
function filmLink(d, row) {
  if (!row) return "";
  const url = tmdbUrl(d, row.id);
  return url ? `<a class="tl-film" ${external(url)}>${esc(row.title)}</a>` : `<em>${esc(row.title)}</em>`;
}
// A poster, or another block, that leads to a film: an <a> when the film has a TMDB id.
function filmBlock(d, id, className, attrs, inner) {
  const url = tmdbUrl(d, id);
  return url ? `<a class="${className}" ${external(url)} ${attrs}>${inner}</a>` : `<span class="${className}" ${attrs}>${inner}</span>`;
}
// SVG marks open the film on click.
const dotLink = (d, id) => {
  const url = tmdbUrl(d, id);
  return url ? ` data-href="${url}"` : "";
};

// Data ---------------------------------------------------------------------------------

const pct = (value) => (value === null || value === undefined ? "–" : value < 0.01 ? "<1%" : `${Math.round(value * 100)}%`);
const num = (value) => Number(value).toLocaleString("en-GB");
const list = (items) => (items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : items.join(""));
const span = (from, to) => `${from}–${String(to).slice(2)}`;
const slug = (text) =>
  text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Context for the five-year periods in which ghost films jumped.
const JUMPS = {
  1980: "led by <em>The Shining</em> and <em>Poltergeist</em>",
  2000: "led by <em>Ringu</em>, <em>Ju-on</em> and their Hollywood remakes",
};
const JUMP_REFS = {
  2000: ["mcroy"],
};
// "early 1980s" for 1980–84, "late 1980s" for 1985–89.
const part = (year) => `${year % 10 < 5 ? "early" : "late"} ${Math.floor(year / 10) * 10}s`;

// Context for the national waves the geography section names.
const WAVES = {
  "Japan 1950": "the decade of <em>Godzilla</em>",
  "Britain 1960": "the heyday of Hammer",
  "Italy 1970": "during the giallo boom",
  "Hong Kong 1980": "with its hopping-vampire comedies",
};

const WAVE_REFS = { "Britain 1960": "hutchings", "Italy 1970": "koven" };

const eraOf = (year) => ERAS.find((era) => era.from <= year && year <= era.to);

// Change in a subject's mean share between two spans of chart years (null if either is empty).
function shareChange(band, [a0, a1], [b0, b1], years) {
  const mean = (lo, hi) => {
    const values = years.map((year, i) => [year, band.shares[i]]).filter(([year, v]) => year >= lo && year <= hi && v !== null && !band.thin?.[years.indexOf(year)]);
    return values.length ? values.reduce((sum, [, v]) => sum + v, 0) / values.length : null;
  };
  const [before, after] = [mean(a0, a1), mean(b0, b1)];
  return before === null || after === null ? null : after - before;
}

// One sentence about a year's horror films, for the birth-year picker.
function yearCard(d, year) {
  const y = d.years[year];
  if (!y) return "";
  const theme = d.bands.find((band) => band.id === y.theme)?.name.toLowerCase();
  const top = d.vocabulary.decades.find((row) => row.decade === Math.floor(year / 10) * 10)?.terms[0];
  const tag = top && top.z >= 7 ? top.term : null;
  const link = (f) => filmLink(d, f);
  return `In ${year}, ${num(y.films)} horror film${y.films === 1 ? "" : "s"} came out. The most common theme ${y.around ? `around then` : "that year"} was ${theme} (${pct(y.share)}). The most-rated was ${link(y.popular)}${y.best && y.best.id !== y.popular.id ? `; the best-rated, ${link(y.best)} (${y.best.rating.toFixed(1)} on TMDB)` : ""}.${tag ? ` The decade’s signature tag: ‘${esc(tag)}’.` : ""}`;
}

// Named themes that grew and shrank most between the two comparison spans, as prose labels.
const THEME_PROSE = {
  killers: "killers", ghosts: "ghosts", demons: "demons", psychological: "psychological horror", home_invasion: "home invasion",
  folk_horror: "folk horror", zombies: "zombies", animals: "killer animals", mutation: "mutants", cannibals: "cannibals",
  vampires: "vampires", witchcraft: "witches", shapeshifters: "werewolves", aliens: "aliens", giant_monsters: "giant monsters", techno: "killer machines",
};
function shiftStats(d) {
  const named = d.bands.filter((band) => THEME_PROSE[band.id]).map((band) => ({ id: band.id, label: THEME_PROSE[band.id], change: band.share_after - band.share_before }));
  const grew = named.filter((row) => row.change >= 0.005).sort((a, b) => b.change - a.change).slice(0, 5);
  const shrank = named.filter((row) => row.change <= -0.01).sort((a, b) => a.change - b.change).slice(0, 4);
  const has = (rows, ids) => ids.every((id) => rows.some((row) => row.id === id));
  // "Dread closer to home" only if the growth really is ghosts, demons and the mind.
  const dreadGrew = has(grew, ["ghosts", "psychological"]) && grew.filter((row) => ["ghosts", "demons", "psychological", "home_invasion", "folk_horror"].includes(row.id)).length >= 3;
  return { grew: dreadGrew ? grew.filter((row) => row.id !== "zombies") : grew, shrank, dreadGrew };
}

// Countries' signature themes in prose: themes shared by several countries are grouped
// ("ghost stories make up 59% of India's horror…"), the rest listed with their ratios.
const SIGNATURE_CONTEXT = { "Japan giant_monsters": ", the home of Godzilla," };
const GROUP_PROSE = { ghosts: ["Ghost stories", "make up"], witchcraft: ["Witchcraft", "makes up"] };
function signatureText(d) {
  const rows = (d.signatures || []).filter((row) => row.ratio >= 1.8);
  const groups = new Map();
  rows.forEach((row) => groups.set(row.theme, [...(groups.get(row.theme) || []), row]));
  const shared = [...groups.values()].filter((members) => members.length > 1);
  const single = [...groups.values()].filter((members) => members.length === 1).map(([row]) => row);
  const times = (ratio) => `${ratio >= 4.5 ? Math.round(ratio) : ratio.toFixed(1)} times`;
  const groupText = shared.map((members) => {
    const [label, verb] = GROUP_PROSE[members[0].theme] || [THEME_PROSE[members[0].theme], "make up"];
    return `${label} ${verb} ${list(members.map((row, i) => `${pct(row.share)} of ${row.name}’s${i === 0 ? " horror films" : ""}`))}, against ${pct(members[0].world)} worldwide.`;
  });
  const singleText = single.length ? `${single.map((row, i) => (i === 0 ? `${row.name}${SIGNATURE_CONTEXT[`${row.name} ${row.theme}`] || ""} makes ${THEME_PROSE[row.theme]} ${times(row.ratio)} as often as the world` : `${row.name}, ${THEME_PROSE[row.theme]} ${times(row.ratio)}`)).join("; ")}.` : "";
  return [singleText, ...groupText].join(" ");
}

// The franchises that fell hardest from their first film, and those whose best film came later.
function franchiseNames(franchises) {
  const rows = franchises.franchises.map((f) => {
    const [first, ...rest] = f.entries;
    const best = f.entries.reduce((a, b) => (b.tmdb > a.tmdb ? b : a));
    return { name: f.name, first, drop: first.tmdb - rest.reduce((sum, e) => sum + e.tmdb, 0) / rest.length, best };
  });
  const later = rows.filter((row) => row.best !== row.first && row.best.tmdb > row.first.tmdb);
  // "The last five years" is counted from the data's build year, so the static text stays true.
  const recent = later.filter((row) => row.best.year >= franchises.built_year - 5);
  return { hardestFalls: [...rows].sort((a, b) => b.drop - a.drop).slice(0, 3), laterBest: later, laterBestRecent: recent };
}

// What the famous films over- and under-represent, and the most famous poorly rated film.
function canonStats(d) {
  const rc = d.reach;
  if (!rc) return {};
  const name = Object.fromEntries(d.bands.map((band) => [band.id, band.name]));
  const ratios = Object.keys(rc.expected_mix).filter((id) => rc.expected_mix[id] >= 0.006).map((id) => ({ id, name: name[id], canon: rc.canon_mix[id] || 0, expected: rc.expected_mix[id], ratio: (rc.canon_mix[id] || 0) / rc.expected_mix[id] }));
  const spectacle = ["giant_monsters", "aliens", "vampires", "zombies", "shapeshifters", "animals", "mutation"];
  const over = ratios.filter((row) => spectacle.includes(row.id) && row.ratio > 1.15).sort((a, b) => b.ratio - a.ratio).slice(0, 3);
  const famous = rc.points.filter((p) => p[4] >= rc.famous_links).sort((a, b) => a[3] - b[3]);
  return { canonGhosts: ratios.find((row) => row.id === "ghosts"), canonOver: over, notorious: famous[0] || null };
}

// The comebacks (films ten or more years after their predecessor) that gained and lost most.
function comebackExamples(franchises) {
  const moves = franchises.franchises.flatMap((f) => f.entries.map((e, i) => (e.comeback ? { film: e, previous: f.entries[i - 1], before: f.entries[i - 1].tmdb, franchiseStart: f.entries[0].year } : null)).filter(Boolean));
  const sorted = moves.sort((a, b) => (b.film.tmdb - b.before) - (a.film.tmdb - a.before));
  return { comebackUp: sorted[0]?.film.tmdb > sorted[0]?.before ? sorted[0] : null, comebackDown: sorted.at(-1)?.film.tmdb < sorted.at(-1)?.before ? sorted.at(-1) : null };
}

function stats(d) {
  const last = d.meta.last_year;
  const v = d.volume;
  const notable = v.years.map((year, i) => [year, v.share_notable[i]]).filter(([year, share]) => year >= 1930 && share !== null);
  const mean = (rows) => rows.reduce((sum, [, share]) => sum + share, 0) / rows.length;
  const plateauOld = mean(notable.filter(([year]) => year >= 1970 && year <= 1990));
  const plateauNew = mean(notable.filter(([year]) => year >= 1995));
  const oneIn = (share) => Math.round(1 / share);
  const words = { 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten" };
  const claims = Object.fromEntries(d.robustness.claims.map((claim) => [claim.id, claim]));
  const band = (id) => d.bands.find((row) => row.id === id);
  const killers = band("killers");
  const ghosts = band("ghosts");
  const periods = d.periods;
  // The comparison's first five-year period onwards (earlier moves are a different story).
  const from = Math.max(1, periods.indexOf(d.movers.before[0]) + 1);
  const threat = Object.fromEntries(d.threats.series.map((series) => [series.key, series]));
  const unnamed = d.threats.unnamed.filter((value) => value !== null);
  const geo = d.geography;
  const since1950 = geo.decades.map((decade, i) => [decade, i]).filter(([decade]) => decade >= 1950).map(([, i]) => i);
  const us = geo.countries.find((row) => row.code === "US");
  const judged = geo.decades.map((_, i) => i).filter((i) => geo.totals[i] >= 300);
  const abroad = geo.countries.filter((row) => row.code !== "US").map((row) => {
    const i = judged.reduce((best, k) => (row.shares[k] > row.shares[best] ? k : best), judged[0]);
    return { name: row.name, share: row.shares[i], decade: geo.decades[i] };
  }).sort((a, b) => b.share - a.share);
  return {
    last, claims, killers, ghosts, periods,
    plateauOld, plateauNew, oneInOld: words[oneIn(plateauOld)] || oneIn(plateauOld), oneInNew: words[oneIn(plateauNew)] || oneIn(plateauNew),
    all1975: v.share_all[v.years.indexOf(1975)], all2020: v.share_all[v.years.indexOf(2020)],
    // Killer films' highest five-year share since the comparison began, and the periods in
    // which ghost films gained three points or more.
    killerPeak: periods.reduce((best, year, i) => (i >= from - 1 && killers.period_shares[i] > killers.period_shares[best] ? i : best), from - 1),
    ghostJumps: periods.map((_, i) => i).filter((i) => i >= from && ghosts.period_shares[i] - ghosts.period_shares[i - 1] >= 0.03),
    threat, unnamedFirst: d.threats.unnamed[d.threats.years.indexOf(d.movers.before[0])], unnamedLast: unnamed.at(-1), unnamedLastYear: d.threats.years[d.threats.unnamed.findLastIndex((value) => value !== null)],
    killerPeakEra: eraOf(killers.peak_year)?.label,
    ...comebackExamples(d.franchises),
    ...canonStats(d),
    ...shiftStats(d),
    signatureText: signatureText(d),
    ...franchiseNames({ ...d.franchises, built_year: new Date(d.meta.built_at).getUTCFullYear() }),
    novelsLead: /frankenstein/i.test(d.revivals.lineages[0]?.title || "") && /nosferatu|dracula/i.test(d.revivals.lineages[1]?.title || ""),
    after911: shareChange(killers, [1995, 2002], [2003, 2009], d.band_years),
    killersBefore911: killers.period_shares[periods.indexOf(2000)],
    usRange: [Math.min(...since1950.map((i) => us.shares[i])), Math.max(...since1950.map((i) => us.shares[i]))],
    abroad: abroad.slice(0, 4),
  };
}

// Article ------------------------------------------------------------------------------

/** The essay's HTML, without the title and lede (the article page shows those). */
export function essayHtml(d) {
  const s = stats(d);
  const cited = [];
  const cite = (...ids) => `<sup class="tl-cite">${ids.map((id) => {
    if (!cited.includes(id)) cited.push(id);
    const n = cited.indexOf(id) + 1;
    return `<a href="#tl-ref-${id}" data-tl-ref aria-label="Reference ${n}">${n}</a>`;
  }).join(",")}</sup>`;
  const h2 = (text) => `<h2 id="${slug(text)}">${text}</h2>`;
  const r = d.revivals;
  const fr = d.franchises;
  const wd = d.methods.validation?.wikidata;
  const film = (row) => filmLink(d, row);
  const [b0, b1] = [d.movers.before, d.movers.after];
  const holds = (id) => s.claims[id]?.holds;
  const top = r.lineages.filter((row) => row.decades >= r.lineages[Math.min(1, r.lineages.length - 1)].decades);
  const updated = new Date(d.meta.built_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return `
    <div class="tl-opening">
      <p>In the 1950s, horror films were overrun with atomic mutants and invaders from space. In the 1980s, masked killers took over. Today, it is ghosts. Film historians have long argued that these shifts mirror the anxieties of their times,${cite("skal", "phillips", "wood")} but their theories are built on the classics everyone remembers. What happens when you look at all the others?</p>
      <p>We gathered every horror film we could find, ${num(d.meta.film_count)} from ${d.meta.first_year} to today, and sorted them by what makes them scary: ${d.bands.length} themes, from vampires and masked killers to aliens and haunted houses, drawn from ${d.methods.sources.length} published guides to the genre. AI models did the sorting${wd ? `, and checked against Wikidata, a database edited by volunteers, they agree on ${pct(wd.scores.final.recall)} of films` : ""}. The whole genre confirms much of the conventional wisdom, and overturns some of it.</p>
      <p class="tl-byline">Data: TMDB, MovieLens, Wikidata · Updated ${updated} · <a href="#tl-methods" data-tl-methods>How we did it</a></p>
    </div>

    <figure class="tl-hero" aria-labelledby="tl-hero-title">
      <figcaption class="tl-fig-head">
        <h3 id="tl-hero-title">What were horror films about?</h3>
        <p>Share of horror films in each major category, ${d.band_years[0]}–${d.band_years.at(-1)}. Select a category to see its themes.</p>
      </figcaption>
      <div class="tl-chart" data-tl-chart="families"></div>
      <div data-tl-chart="subjects" aria-live="polite"></div>
      <p class="tl-source">Five-year rolling averages; dotted lines mean fewer than 10 films. <a href="${HORRORVERSE}" target="_blank" rel="noopener">Horrorverse</a> maps the same films by plot.</p>
    </figure>

    ${d.years ? `<aside class="tl-year">
      <label for="tl-year">What was horror about the year you were born?</label>
      <div class="tl-year-pick">
        <button type="button" data-tl-year-step="-1" aria-label="One year earlier">−</button>
        <input type="range" id="tl-year" data-tl-year min="${Object.keys(d.years)[0]}" max="${Object.keys(d.years).at(-1)}" step="1" value="${selectedYear}">
        <button type="button" data-tl-year-step="1" aria-label="One year later">+</button>
        <output class="tl-year-num" for="tl-year">${selectedYear}</output>
      </div>
      <p class="tl-year-out" aria-live="polite">${yearCard(d, selectedYear)}</p>
    </aside>` : ""}

    ${holds("killers") && holds("ghosts") ? `<section class="tl-section">
      ${h2("What replaced the slasher?")}
      <p>For a generation of viewers, horror meant a masked man with a knife: <em>Halloween</em> and <em>Friday the 13th</em> set off a cycle of slasher films that defined the genre in the 1980s.${cite("nowell", "clover")} Horror today looks different. Different how, and since when?</p>
      <p>Ghosts, mostly, and slowly: the change took four decades. In ${b0[0]}–${String(b0[1]).slice(2)}, at the height of the slasher boom, ${pct(s.killers.share_before)} of horror films were about killers and ${pct(s.ghosts.share_before)} about ghosts. By ${b1[0]}–${String(b1[1]).slice(2)}, killers were down to ${pct(s.killers.share_after)} and ghosts up to ${pct(s.ghosts.share_after)}.</p>
      <p>But the two trends didn’t move together. Killer films have declined steadily since the ${part(s.periods[s.killerPeak])}, from ${pct(s.killers.period_shares[s.killerPeak])} of horror films to ${pct(s.killers.period_shares.at(-1))} today. Ghost stories rose in ${s.ghostJumps.length === 1 ? "one wave" : `${s.ghostJumps.length === 2 ? "two" : s.ghostJumps.length} waves`}: ${s.ghostJumps.map((i, k) => `${k === 0 ? (s.ghostJumps.length > 1 ? "first " : "") : "then "}in the ${part(s.periods[i])}${JUMPS[s.periods[i]] ? `, ${JUMPS[s.periods[i]]}${JUMP_REFS[s.periods[i]] ? cite(...JUMP_REFS[s.periods[i]]) : ""}` : ""}`).join(", ")}. The pattern holds for big hits and obscure releases alike, in Hollywood and abroad.</p>
      <p>Behind those two numbers is a wider change. What shrank was ${list(s.shrank.map((row) => row.label))}. What grew was ${s.dreadGrew ? "dread closer to home: " : ""}${list(s.grew.map((row) => row.label))}${s.dreadGrew ? `, what critics have since called ‘elevated horror’ or ‘post-horror’${cite("church")}` : ""}.</p>
      ${figure("movers", "Which themes grew, and which shrank", `Share of horror films by theme, ${b0[0]}–${String(b0[1]).slice(2)} against ${b1[0]}–${String(b1[1]).slice(2)}`, "")}
    </section>` : ""}

    ${d.reach ? `<section class="tl-section">
      ${h2("Do the famous films tell the whole story?")}
      <p>Histories of horror are written from the films people remember: the hits, the classics, the films that get remade and taught. If those films are a fair sample, the histories hold. If not, whole trends can go unnoticed.</p>
      <p>They are not a fair sample. Take the ${num(d.reach.canon_films)} horror films with Wikipedia articles in at least ${d.reach.canon_links} languages, the ones historians write about and everyone has heard of. Compared with all horror films from the same decades, they hold ${s.canonGhosts.ratio < 0.8 ? `a third fewer ghost stories (${pct(s.canonGhosts.canon)} instead of ${pct(s.canonGhosts.expected)})` : `about as many ghost stories (${pct(s.canonGhosts.canon)} against ${pct(s.canonGhosts.expected)})`} and fewer killers, but far more spectacle than horror as a whole: ${list(s.canonOver.map((row) => (row.ratio >= 1.9 ? `${row.ratio.toFixed(1)} times the share of ${THEME_PROSE[row.id]}` : `${Math.round((row.ratio - 1) * 100)}% more ${THEME_PROSE[row.id]}`)))}. The rise of the ghost story happened mostly in films that never became famous.</p>
      ${figure("canon", "What the famous films over- and under-represent", `How much more or less often each theme appears among films with Wikipedia articles in ${d.reach.canon_links}+ languages than among all horror films from the same decades`, "")}
      <p>Fame and quality only loosely go together. Films with articles in ${d.reach.famous_links} or more languages average ${d.reach.famous_mean.toFixed(1)} on TMDB, against ${d.reach.all_mean.toFixed(1)} for all films with ${d.reach.min_votes}+ ratings, but ${s.notorious ? `${filmLink(d, { id: s.notorious[0], title: s.notorious[1] })} (${s.notorious[2]}) has articles in ${s.notorious[4]} languages at a rating of ${s.notorious[3].toFixed(1)}` : "some famous films rate poorly"}.</p>
      ${figure("reach", "Fame against rating", `TMDB rating of every horror film with ${d.reach.min_votes}+ ratings, against the number of Wikipedia languages with an article on it`, "")}
    </section>` : ""}

    <section class="tl-section">
      ${h2("Does horror mirror the news?")}
      <p>Horror is often read as a barometer: each era’s monsters stand for what that era feared.${cite("skal", "phillips")} If that is right, the genre is a record of a century’s anxieties. If not, it is a story critics tell after the fact.</p>
      <p>Up to 1990, the data backs the historians. After that, the story changes. In 1989 the sociologist Andrew Tudor studied nearly 1,000 horror films released in Britain${cite("tudor")} and found fear moving closer to home over the century: away from gothic monsters and mad laboratories, towards the disturbed human mind.</p>
      <p>${holds("science_peak") ? `Across all the films, the first half of that story holds. In the 1950s, the decade of H-bomb tests and Sputnik, science gone wrong peaked.${cite("skal")} Around ${s.threat.science.peak.year} it accounted for nearly half of the horror films whose threat is clear (${pct(s.threat.science.peak.share)}), from <em>Them!</em> to <em>The Fly</em>, against ${pct(s.threat.science.values.at(-1))} today.` : ""} ${holds("human_peak") ? "From the 1960s through the 1980s, after <em>Psycho</em>, human killers and disturbed minds led, just as Tudor found." : ""}</p>
      <p>${holds("supernatural_half") ? "Then the pendulum swung back. Since the 1990s, the supernatural has been behind at least 40% of horror films in every decade." : ""} ${s.after911 === null ? "" : s.after911 >= 0.02 ? "The post-9/11 wave of ‘torture porn’, films like <em>Saw</em> and <em>Hostel</em>, shows up as a short rise in killer films." : `The post-9/11 years are often remembered for ‘torture porn’,${cite("edelstein", "wetmore")} because <em>Saw</em> and <em>Hostel</em> were hits. Across the thousands of other horror films made in the 2000s, killer films held steady at ${pct(s.killersBefore911)}; the growth was in ghosts.`}</p>
      ${figure("threats", "Where the threat comes from", "Share of horror films by source of threat, where the threat is clear; five-year rolling average", "Historical eras based on Skal, Wood, Clover, McRoy and Wetmore; threat categories adapted from Tudor (see references).")}
    </section>

    <section class="tl-section">
      ${h2("How much of cinema is horror?")}
      <p>Every few years, horror is said to be having a boom. Is it a bigger part of cinema than it used to be?</p>
      <p>Not among the films people watch: it was one film in ${s.oneInOld} in the 1970s and 80s, and is one in ${s.oneInNew} now. Among films with at least 20 ratings on TMDB, which leaves out the truly obscure, horror made up about ${pct(s.plateauOld)} of releases from 1970 to 1990 and has hovered around ${pct(s.plateauNew)} since 1995. Count every film in the database and horror’s share jumps from ${pct(s.all1975)} in 1975 to ${pct(s.all2020)} in 2020: a flood of micro-budget films that almost no one has seen.${d.reach?.flood ? ` Much of that flood is ghost stories: since 2010, ${pct(d.reach.flood.unrated.ghosts)} of the films too obscure to have 20 ratings are about ghosts, against ${pct(d.reach.flood.rated.ghosts)} of the rest.` : ""}</p>
      ${figure("volume", "Horror’s share of all films", "Among films with at least 20 ratings on TMDB; five-year rolling average", "Films can belong to several genres.")}
    </section>

    <section class="tl-section">
      ${h2("Do horror sequels hold up?")}
      <p>Horror is the genre of the franchise: few others turn one hit into ten films. Are the sequels worth watching?</p>
      <p>Rarely. In ${fr.tmdb.first_best} of the ${fr.tmdb.franchises} most-rated horror franchises, the original is still the best-rated film, and the films that follow score ${fr.tmdb.mean_drop >= 0.95 && fr.tmdb.mean_drop < 1.05 ? "a full point" : `${fr.tmdb.mean_drop.toFixed(1)} points`} lower on average on TMDB’s 10-point scale, with the same drop on MovieLens. Waiting ten years or more is a coin toss: of ${fr.tmdb.comebacks} such films, ${fr.tmdb.comebacks_up} beat the one before them.${s.comebackUp ? ` ${film(s.comebackUp.film)} (${s.comebackUp.film.year}) climbed to ${s.comebackUp.film.tmdb.toFixed(1)} after <em>${esc(s.comebackUp.previous.title)}</em> scored ${s.comebackUp.previous.tmdb.toFixed(1)}` : ""}${s.comebackDown ? `; ${film(s.comebackDown.film)} (${s.comebackDown.film.year}) fell to ${s.comebackDown.film.tmdb.toFixed(1)} from the ${s.comebackDown.previous.year === s.comebackDown.franchiseStart ? "original’s" : `${s.comebackDown.previous.year} film’s`} ${s.comebackDown.previous.tmdb.toFixed(1)}.` : "."} The hardest falls came after the greatest originals: ${list(s.hardestFalls.map((row) => `<em>${esc(row.name)}</em> (${row.first.tmdb.toFixed(1)}, then ${(row.first.tmdb - row.drop).toFixed(1)} on average)`))}.${s.laterBest.length ? ` Of the ${s.laterBest.length} franchises whose best film came later, ${s.laterBestRecent.length} owe it to a film from the last five years, whose ratings are still settling, such as ${film(s.laterBestRecent[0]?.best || s.laterBest[0].best)}.` : ""}</p>
      ${figure("franchises", "Horror franchises, film by film", "TMDB ratings by release year, for the most-rated franchises", "")}
    </section>

    <section class="tl-section">
      ${h2("Which stories keep coming back?")}
      <p>Remakes are as old as horror itself, and some stories have been filmed again in nearly every decade since the silent era. Which ones?</p>
      <p>${s.novelsLead ? `Two nineteenth-century novels above all. Mary Shelley’s <em>Frankenstein</em> has been filmed again in ${r.lineages[0].decades} decades since its first adaptation in ${r.lineages[0].year}, and Bram Stoker’s <em>Dracula</em>, starting with the unauthorised ${film(r.lineages[1])} in ${r.lineages[1].year}, in ${r.lineages[1].decades}.` : `${list(top.map((row) => `${film(row)} (${row.decades} decades)`))}.`} ${r.lineages.length > 3 && r.lineages[2].decades === r.lineages[3].decades ? `${list(r.lineages.slice(2, 4).map((row) => film(row)))} share third place, with ${r.lineages[2].decades} decades each.` : ""}</p>
      ${figure("revivals", "Classic stories that keep getting remade", "Each row starts with a story’s earliest film, followed by one later version from each decade it was remade or adapted", "")}
    </section>

    <section class="tl-section">
      ${h2("Where is horror made?")}
      <p>Horror is often treated as a Hollywood genre, but every film industry has its own monsters. How American is it, and what does everyone else fear?</p>
      <p>More American than anything else: the United States made between ${pct(s.usRange[0])} and ${pct(s.usRange[1])} of each decade’s horror films since 1950. Elsewhere, horror came in national waves: ${s.abroad.map((row) => `${row.name} in the ${row.decade}s${WAVES[`${row.name} ${row.decade}`] ? `, ${WAVES[`${row.name} ${row.decade}`]}${WAVE_REFS[`${row.name} ${row.decade}`] ? cite(WAVE_REFS[`${row.name} ${row.decade}`]) : ""}` : ""} (${pct(row.share)})`).join("; ")}.</p>
      ${d.signatures?.length ? `<p>Each country also has its own signature nightmare: the theme it makes far more often than the world does. ${s.signatureText}</p>
      ${figure("signatures", "Each country’s signature nightmare", "The theme each country makes most often compared with the world, for countries with 200+ labelled films", "")}` : ""}
      ${figure("geography", "Horror films by country and decade", "Share of each decade’s horror films, each country on its own scale; dotted where a decade has fewer than 300 films listed", "TMDB is maintained mostly by English-speaking volunteers, so non-English films are undercounted. Countries shown reached 3% in at least one decade.")}
    </section>

    <section class="tl-section">
      ${h2("How do people describe each decade?")}
      <p>How viewers talk about horror changes too, and the words they reach for say what they remember about each era.</p>
      <p>Every era has its own buzzwords. On TMDB, users tag films with keywords, and some tags turn up far more often in one decade than in any other. ‘Mad scientist’ peaks in the 1940s and fades by the 1960s; ‘slasher’ defines the 1980s and remains a staple; ‘found footage’ takes over in the 2010s.</p>
      ${figure("vocabulary", "Each decade’s signature keyword", "The tag most distinctive of each decade, traced across all decades", "TMDB user keywords, most of them added in recent years.")}
    </section>

    <section class="tl-section tl-close">
      ${h2("So what were we afraid of?")}
      <p>Seen whole, a century of horror mostly confirms the story historians tell: atomic monsters in the 1950s, human killers and broken minds through the 1980s, the supernatural ever since. Where it differs is in what got noticed.${s.canonGhosts?.ratio < 0.8 ? " The ghost story, the biggest growth of the last forty years, grew mostly in films few people remember." : ""}${s.after911 !== null && s.after911 < 0.02 ? " The post-9/11 torture cycle that dominated the conversation barely moved the numbers." : ""} The famous films are the ones history gets written from. The rest are where much of the genre actually changed.</p>
      <p>To find your own way through them, <a href="${HORRORVERSE}" target="_blank" rel="noopener">Horrorverse</a> maps every one of these films by plot.</p>
    </section>

    ${cited.length ? `<section class="tl-section tl-refs"><h2 class="tl-refs-title">References</h2><ol>${cited.map((id) => `<li id="tl-ref-${id}">${REFERENCES[id]}</li>`).join("")}</ol></section>` : ""}

    ${methodsFoldout(d)}

    <p class="tl-attrib">Film data and posters from <a href="https://www.themoviedb.org/" target="_blank" rel="noopener">TMDB</a>, ratings from <a href="https://movielens.org/" target="_blank" rel="noopener">MovieLens</a>, subgenres and Wikipedia links from <a href="https://www.wikidata.org/" target="_blank" rel="noopener">Wikidata</a>. This product uses the TMDB API but is not endorsed or certified by TMDB.</p>`;
}

function figure(key, title, subtitle, source) {
  return `<figure class="tl-fig tl-fig-${key}"><figcaption class="tl-fig-head"><h3>${title}</h3><p>${subtitle}</p></figcaption><div class="tl-chart" data-tl-chart="${key}"></div>${source ? `<p class="tl-source">${source}</p>` : ""}</figure>`;
}

// Methods foldout ----------------------------------------------------------------------

function methodsFoldout(d) {
  const m = d.methods;
  const v = m.validation;
  const ex = m.example;
  const film = (row) => filmLink(d, row);
  const rb = d.robustness;
  const unsourced = m.crosswalk.filter((row) => !row.sources.length);
  const types = Object.keys(m.source_types);
  const verification = { direct: "read in full", toc: "contents only", secondary: "via secondary sources" };
  const sourceCards = types.map((type) => `<div class="tl-src-group"><h5>${m.source_types[type]}</h5><ul>${m.sources.filter((src) => src.type === type).map((src) => `<li><span>${esc(src.name)}</span><small class="tl-ver tl-ver-${src.verification}">${verification[src.verification]}</small></li>`).join("")}</ul></div>`).join("");
  const check = (pass, text) => `<span class="tl-verdict tl-verdict-${pass}">${text}</span>`;
  const name = Object.fromEntries(d.bands.map((band) => [band.id, band.name]));
  const wd = v.wikidata;
  const final = wd.scores.final;
  const before = wd.scores.synopsis_only;
  const review = v.disagreement_review;
  const share = (key) => (review.sampled ? (review.verdicts[key] || 0) / review.sampled : 0);
  const checkRows = Object.entries(final.subjects).map(([id, row]) => `<tr><th scope="row">${esc(name[id])}</th><td>${num(row.films)}</td><td>${pct(before.subjects[id]?.recall)}</td><td>${pct(row.recall)}</td><td>${row.judged ? check(row.passes ? "pass" : "fail", row.passes ? "passes" : "fails") : '<span class="tl-verdict">too few films</span>'}</td></tr>`).join("")
    + `<tr class="tl-total"><th scope="row">All themes</th><td>${num(Object.values(final.subjects).reduce((sum, row) => sum + row.films, 0))}</td><td>${pct(before.recall)}</td><td>${pct(final.recall)}</td><td></td></tr>`;
  const rbChecks = rb.variants.length - 1;
  const r = d.revivals;
  const pipeline = [
    [m.sources.length, "classifications", "of horror, from scholarship to film catalogues"],
    [d.bands.length, "themes", `merged from their ${num(m.raw_labels)} categories`],
    [num(v.films), "films labelled", `by two models; a third settled ${pct((v.sources.adjudicated || 0) / v.films)} of them`],
    [pct(final.recall), "match Wikidata", "on films held back while writing the rules"],
    [rb.claims.length, "findings tested", `in ${rbChecks} variants of the data`],
  ];
  return `
  <section class="tl-methods" id="tl-methods">
    <details class="disclosure tl-methods-fold">
      <summary><span class="tl-methods-summary"><span class="tl-methods-title">How we sorted and checked ${num(d.meta.film_count)} films</span><span class="tl-methods-hint">Methods: sources, labels and checks</span></span></summary>
      <div class="tl-methods-body">
        <ol class="tl-pipe">${pipeline.map(([value, label, note], i) => `<li><span class="tl-pipe-n">${i + 1}</span><strong>${value}</strong><span class="tl-pipe-label">${label}</span><small>${note}</small></li>`).join("")}</ol>

        <div class="tl-step"><div class="tl-step-num">1</div><div class="tl-step-body">
          <h3>Collecting classifications</h3>
          <p>The themes come from ${m.sources.length} published classifications of horror: scholarship, encyclopedias, film catalogues, and sources on horror outside Europe and North America. ${m.sources.filter((src) => src.verification !== "direct").length} could only be checked through contents pages or other authors’ summaries.</p>
          <div class="tl-src-grid">${sourceCards}</div>
        </div></div>

        <div class="tl-step"><div class="tl-step-num">2</div><div class="tl-step-body">
          <h3>Merging them into themes</h3>
          <p>Two models, working independently, merged the ${num(m.raw_labels)} categories into one tree; they agreed on 97% of the sorting. The top level follows Andrew Tudor’s sources of threat. Categories labellers could not reliably tell apart in a pilot were folded into their parent, leaving ${d.bands.length} themes. ${unsourced.length} categories (${list(unsourced.map((row) => row.name.toLowerCase()))}) were added while merging and appear in no source.</p>
          <figure class="tl-fig tl-fig-crosswalk"><figcaption class="tl-fig-head"><h4>Which sources list each theme</h4><p>A filled square marks themes listed by at least two kinds of source.</p></figcaption><div class="tl-chart" data-tl-chart="crosswalk"></div></figure>
        </div></div>

        <div class="tl-step"><div class="tl-step-num">3</div><div class="tl-step-body">
          <h3>Labelling the films</h3>
          <p>${v.labellers.join(" and ")} each labelled every film, seeing its title, year, countries, genres, synopsis and TMDB keywords, and could use what they knew about it. Each gave one to three themes, a source of threat and a confidence, following written definitions and rules (a Dracula film is a vampire film whatever its setting; a stalking killer is a killer even when supernatural). They agreed on the main theme of ${pct(v.main_agreement)} of films; ${v.adjudicator} decided the rest, and films of one series that still disagreed were reviewed together.</p>
          ${ex ? `<div class="tl-example">
            <div class="tl-example-in"><span class="tl-example-label">What the models saw</span><p><strong>${esc(ex.title)} (${ex.year})</strong> · ${esc(ex.genres.join(", "))}</p><p>${esc(ex.synopsis)}</p><p>Keywords: ${esc(ex.keywords.join(", "))}</p></div>
            <div class="tl-example-arrow" aria-hidden="true">→</div>
            <div class="tl-example-out"><span class="tl-example-label">The label</span><ol>${ex.label_names.map((label) => `<li>${esc(label)}</li>`).join("")}</ol><p>Threat: ${esc(ex.threat)} · confidence: ${esc(ex.confidence)}</p><p class="tl-example-film">The film: ${film(ex)}</p></div>
          </div>` : ""}
          <ul class="tl-bandlist">${m.bands.map((band) => `<li><strong>${esc(band.name)}</strong><span>${esc(band.codes.join(", "))}</span></li>`).join("")}</ul>
        </div></div>

        <div class="tl-step"><div class="tl-step-num">4</div><div class="tl-step-body">
          <h3>Checking the labels against Wikidata</h3>
          <p>Wikidata’s volunteers file ${num(wd.films_with_subgenre)} of these films under a subgenre that matches one of our themes (‘vampire film’, ‘ghost film’, ‘slasher film’). We wrote the rules using half of those films; the table scores the other half: of the films Wikidata files under a theme, the share our labels also put there. The ${pct(wd.min_recall)} bar was set before any scoring. ‘First labels’ were an earlier attempt by one smaller model reading synopses alone.</p>
          <div class="tl-table-wrap"><table class="tl-table tl-checks"><thead><tr><th scope="col">Theme</th><th scope="col">Films</th><th scope="col">First labels</th><th scope="col">Final labels</th><th scope="col"><span class="visually-hidden">Verdict</span></th></tr></thead><tbody>${checkRows}</tbody></table></div>
          <p>Wikidata is not always right either: it calls <em>Evil Dead</em> (2013) a zombie film and <em>Insidious</em> psychological horror.${review.sampled ? ` Shown a random ${review.sampled} of the ${num(review.disagreements)} disagreements with both answers and the film, ${review.model} sided with Wikidata in ${pct(share("wikidata"))}, with our labels in ${pct(share("ours"))}, and called ${pct(share("unsure"))} a matter of taste.` : ""}</p>
        </div></div>

        <div class="tl-step"><div class="tl-step-num">5</div><div class="tl-step-body">
          <h3>Checking the findings</h3>
          <p>Each headline finding was recomputed for well-known films only, the most confident labels, each film’s main theme only, films from English-speaking countries and from all others, and with the first, synopsis-only labels, so that what the models know about famous films cannot drive a finding. The page states a finding only if it holds in all of them.</p>
          <div class="tl-table-wrap"><table class="tl-table tl-robust"><thead><tr><th scope="col">Finding</th>${rb.variants.map((variant) => `<th scope="col">${esc(variant)}</th>`).join("")}</tr></thead><tbody>${rb.claims.map((claim) => `<tr class="${claim.holds ? "" : "tl-failed"}"><th scope="row">${esc(claim.text)}${claim.holds ? "" : " <small>(not stated)</small>"}</th>${claim.values.map((value) => `<td class="${value.holds ? "tl-ok" : "tl-no"}">${esc(value.value)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
        </div></div>

        <div class="tl-notes">
          <h3>Notes</h3>
          <p><strong>Films.</strong> The ${num(d.meta.film_count)} films that TMDB or MovieLens list as horror, with TMDB metadata as of ${new Date(d.meta.built_at).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}. Shares use a five-year window centred on each year, widened up to fifteen years before 1956, where films are fewer; charts end in ${d.band_years.at(-1)}, the last year with a full window. A film with several themes counts partly toward each.</p>
          <p><strong>Franchises.</strong> TMDB collections with at least four horror films of 50+ votes; the ${d.franchises.tmdb.franchises} with the most votes in total. MovieLens ratings, on a five-point scale, are doubled for comparison and used where 50+ people rated a film.</p>
          <p><strong>Stories that came back.</strong> For each film made by 1985 with 100+ votes, the twelve most similar later synopses (20+ years on; BGE-small embeddings) were judged by Claude Sonnet as remake, same source, retelling, sequel or unrelated (${num(r.checked_pairs)} pairs); Claude Opus then checked every later film against the first film of its row (${num(r.confirmed_accepted)} of ${num(r.confirmed_pairs)} confirmed).</p>
          <p><strong>Keywords.</strong> Distinctiveness is a log-odds ratio with an informative Dirichlet prior (Monroe, Colaresi and Quinn, 2008); shares count films with at least one keyword. Countries and all-film counts come from TMDB’s own totals.</p>
        </div>
      </div>
    </details>
  </section>`;
}

// Mounting -----------------------------------------------------------------------------

/** Draw the charts into the essay rendered by essayHtml() and make it interactive. */
export function mountEssay(view, d) {
  data = d;
  const tip = document.createElement("div");
  tip.className = "tl-tip";
  tip.hidden = true;
  view.append(tip);
  const drawChart = (node) => {
    const width = node.clientWidth;
    if (width) node.innerHTML = CHARTS[node.dataset.tlChart](data, width);
  };
  const drawCharts = () => view.querySelectorAll("[data-tl-chart]").forEach(drawChart);
  const families = view.querySelector('[data-tl-chart="families"]');
  const subjects = view.querySelector('[data-tl-chart="subjects"]');
  if (selectedFamily === undefined) selectFamily(window.innerWidth < 700 ? null : "supernatural");
  drawCharts();
  const fold = view.querySelector(".tl-methods-fold");
  fold?.addEventListener("toggle", () => {
    if (fold.open) fold.querySelectorAll("[data-tl-chart]").forEach(drawChart);
  });

  // Redraw when the essay's width changes (not on height-only changes such as a phone's toolbar).
  let resizeTimer = 0;
  let lastWidth = view.clientWidth;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (view.clientWidth === lastWidth) return;
      lastWidth = view.clientWidth;
      tip.hidden = true;
      drawCharts();
    }, 120);
  });

  const showYear = (year) => {
    const input = view.querySelector("[data-tl-year]");
    selectedYear = Math.min(Number(input.max), Math.max(Number(input.min), year));
    input.value = selectedYear;
    view.querySelector(".tl-year-num").textContent = selectedYear;
    view.querySelector(".tl-year-out").innerHTML = yearCard(data, selectedYear);
  };

  view.addEventListener("click", (event) => {
    const dot = event.target.closest("[data-href]");
    if (dot) { window.open(dot.dataset.href, "_blank", "noopener"); return; }
    const yearStep = event.target.closest("[data-tl-year-step]");
    if (yearStep) { showYear(selectedYear + Number(yearStep.dataset.tlYearStep)); return; }
    const ref = event.target.closest("[data-tl-ref]");
    if (ref) {
      event.preventDefault();
      view.querySelector(ref.getAttribute("href"))?.scrollIntoView({ behavior: smooth(), block: "center" });
      return;
    }
    if (event.target.closest("[data-tl-methods]")) {
      event.preventDefault();
      fold.open = true;
      fold.scrollIntoView({ behavior: smooth(), block: "start" });
      return;
    }
    const family = event.target.closest("[data-tl-family]");
    if (family) {
      const id = family.dataset.tlFamily;
      selectFamily(selectedFamily === id ? null : id);
      drawChart(families);
      drawChart(subjects);
      // On phones the subjects sit below all six families: bring them into view.
      if (selectedFamily && window.innerWidth < 700) subjects.scrollIntoView({ behavior: smooth(), block: "start" });
      return;
    }
    if (event.target.closest("[data-tl-franchises]")) {
      showAllFranchises = !showAllFranchises;
      drawChart(view.querySelector('[data-tl-chart="franchises"]'));
      return;
    }
    const band = event.target.closest("[data-tl-band]");
    if (band) { selectedBand = Number(band.dataset.tlBand); drawChart(subjects); }
  });
  view.addEventListener("pointermove", (event) => {
    const target = event.target.closest?.("[data-tip]");
    if (!target || !view.contains(target)) { tip.hidden = true; return; }
    showTip(tip, target.dataset.tip, event.clientX, event.clientY);
  });
  view.addEventListener("focusin", (event) => {
    const target = event.target.closest?.("[data-tip]");
    if (!target) return;
    const box = target.getBoundingClientRect();
    showTip(tip, target.dataset.tip, box.left + box.width / 2, box.top);
  });
  const hide = () => { tip.hidden = true; };
  view.addEventListener("focusout", hide);
  view.addEventListener("pointerleave", hide);
  window.addEventListener("scroll", hide, { passive: true });
  view.addEventListener("input", (event) => {
    if (event.target.closest?.("[data-tl-year]")) showYear(Number(event.target.value));
  });
}

// Opening a family selects its largest named subject, whose films are shown.
function selectFamily(id) {
  selectedFamily = id;
  if (!id) return;
  const bands = data.family_shares.find((f) => f.id === id).bands.filter((i) => !data.bands[i].id.endsWith("_other"));
  const latest = (i) => data.bands[i].shares.filter((v) => v !== null).at(-1) ?? 0;
  selectedBand = bands.reduce((best, i) => (latest(i) > latest(best) ? i : best), bands[0]);
}

function showTip(tip, html, x, y) {
  tip.innerHTML = html;
  tip.hidden = false;
  const box = tip.getBoundingClientRect();
  const left = Math.min(Math.max(8, x + 14), window.innerWidth - box.width - 8);
  const top = y - box.height - 12 < 8 ? y + 18 : y - box.height - 12;
  tip.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
}

// Charts -------------------------------------------------------------------------------

function scale(d0, d1, r0, r1) {
  const fn = (value) => r0 + ((value - d0) / (d1 - d0 || 1)) * (r1 - r0);
  fn.invert = (value) => d0 + ((value - r0) / (r1 - r0 || 1)) * (d1 - d0);
  return fn;
}

function yearTicks(start, end, width) {
  const step = width < 420 ? 40 : width < 760 ? 20 : 10;
  const ticks = [];
  for (let year = Math.ceil(start / step) * step; year <= end; year += step) ticks.push(year);
  return ticks;
}

function axisX(ticks, x, y, { label = (value) => value } = {}) {
  return ticks.map((tick) => `<text class="tl-axis" x="${x(tick)}" y="${y + 18}" text-anchor="middle">${label(tick)}</text>`).join("");
}

function gridY(ticks, y, x0, x1, label) {
  return ticks.map((tick) => `<line class="tl-grid${tick === 0 ? " tl-base" : ""}" x1="${x0}" x2="${x1}" y1="${y(tick)}" y2="${y(tick)}"/><text class="tl-axis" x="${x0}" y="${y(tick) - 5}">${label(tick)}</text>`).join("");
}

function linePath(values, x, y, years) {
  let path = "";
  let open = false;
  values.forEach((value, index) => {
    if (value === null) { open = false; return; }
    path += `${open ? "L" : "M"}${x(years[index]).toFixed(1)},${y(value).toFixed(1)}`;
    open = true;
  });
  return path;
}

function hoverColumns(years, x, top, bottom, tipFor) {
  const width = years.length > 1 ? x(years[1]) - x(years[0]) : 10;
  return years.map((year, index) => {
    const html = tipFor(index);
    return html ? `<rect class="tl-hit" x="${(x(year) - width / 2).toFixed(1)}" y="${top}" width="${width.toFixed(1)}" height="${bottom - top}" data-tip="${attr(html)}"/>` : "";
  }).join("");
}

const attr = (html) => html.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

let fadeId = 0;
const latestShare = (shares) => shares.filter((v) => v !== null).at(-1) ?? null;
const niceTop = (max, step) => Math.max(step, Math.ceil(max / step) * step);

// One small chart of a share over the years: area, line, labelled y gridlines, a peak note and
// a hover column per year.
function smallMultiple(years, shares, thin, name, { width, height, top, ticks, yLabels, peak = null, when = (year) => year }) {
  const left = yLabels ? 30 : 0;
  const [right, above, below] = [4, 16, 20];
  const x = scale(years[0], years.at(-1), left, width - right);
  const y = scale(0, top, height - below, above);
  const base = y(0).toFixed(1);
  // Runs of years that rest on enough films (solid, with an area) or too few (dotted);
  // neighbouring runs share their boundary point so the line stays continuous.
  const runs = [];
  shares.forEach((value, index) => {
    if (value === null) return;
    const point = `${x(years[index]).toFixed(1)},${y(value).toFixed(1)}`;
    const last = runs.at(-1);
    if (last && last.thin === thin[index] && last.end === index - 1) { last.points.push(point); last.end = index; return; }
    const joined = last && last.end === index - 1 ? [last.points.at(-1)] : [];
    runs.push({ thin: thin[index], points: [...joined, point], end: index });
  });
  const fade = `tl-fade-${(fadeId += 1)}`;
  const defs = `<defs><linearGradient id="${fade}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" class="tl-fade-top"/><stop offset="1" class="tl-fade-bottom"/></linearGradient></defs>`;
  const marks = runs.map((run) => (run.thin
    ? `<path class="tl-sm-line thin" d="M${run.points.join("L")}"/>`
    : `<path class="tl-sm-area" fill="url(#${fade})" d="M${run.points[0].split(",")[0]},${base}L${run.points.join("L")}L${run.points.at(-1).split(",")[0]},${base}Z"/><path class="tl-sm-line" d="M${run.points.join("L")}"/>`)).join("");
  const grid = ticks.map((tick) => `<line class="${tick === 0 ? "tl-base" : "tl-grid"}" x1="${left}" x2="${width - right}" y1="${y(tick)}" y2="${y(tick)}"/>${yLabels && tick > 0 ? `<text class="tl-axis" x="${left - 6}" y="${y(tick) + 4}" text-anchor="end">${Math.round(tick * 100)}%</text>` : ""}`).join("");
  const xTicks = [1940, 1980, 2020].map((tick) => `<text class="tl-axis" x="${x(tick)}" y="${height - 4}" text-anchor="middle">${tick}</text>`).join("");
  let note = "";
  if (peak) {
    const [year, value] = peak;
    const px = x(year);
    const anchor = px > width * 0.72 ? "end" : px < left + width * 0.2 ? "start" : "middle";
    note = `<circle class="tl-sm-peak" cx="${px.toFixed(1)}" cy="${y(value).toFixed(1)}" r="2.5"/><text class="tl-sm-note" x="${px.toFixed(1)}" y="${(y(value) - 7).toFixed(1)}" text-anchor="${anchor}">${pct(value)} in ${when(year)}</text>`;
  }
  const hover = hoverColumns(years, x, above, height - below, (index) => (shares[index] === null ? "" : `<strong>${name}, ${when(years[index])}</strong><span>${pct(shares[index])} of horror films${thin[index] ? " (fewer than 10 films: uncertain)" : ""}</span>`));
  return `<svg class="tl-sm-chart" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${name}: share of horror films by year">${defs}${grid}${xTicks}${marks}${note}${hover}</svg>`;
}

// The film with the most votes from each decade, as a row of posters.
function filmStrip(d, band) {
  const posters = band.posters.map((item) => filmBlock(d, item.id, "tl-strip-film", `data-tip="${attr(`<strong>${esc(item.title)}</strong><span>${item.year}</span>`)}"`, `<img src="${POSTER_STRIP}${esc(item.poster)}" alt="${esc(item.title)} (${item.year})" loading="lazy"><span>${Math.floor(item.year / 10) * 10}s</span>`)).join("");
  return `<div class="tl-films"><p class="tl-films-head"><strong>${esc(band.name)}</strong> · the most-rated film of each decade</p><div class="tl-strip">${posters}</div></div>`;
}

const CHARTS = {
  families(d, width) {
    const cols = width < 520 ? 2 : 3;
    const gap = width < 700 ? 24 : 40;
    const cellWidth = Math.floor((width - gap * (cols - 1)) / cols);
    const top = niceTop(Math.max(...d.family_shares.flatMap((f) => f.shares.filter((v) => v !== null))), 0.1);
    const cells = d.family_shares.map((family, index) => {
      const on = family.id === selectedFamily;
      const chart = smallMultiple(d.band_years, family.shares, family.thin, family.name, {
        width: cellWidth, height: width < 520 ? 92 : width < 700 ? 104 : 128, top, ticks: [0, top / 2, top], yLabels: index % cols === 0, peak: [family.peak_year, family.peak_share],
      });
      return `<button type="button" class="tl-sm${on ? " on" : ""}" data-tl-family="${esc(family.id)}" aria-pressed="${on}"><span class="tl-sm-head"><span class="tl-sm-name">${esc(family.name)}</span><span class="tl-sm-share">${pct(latestShare(family.shares))}</span></span>${chart}</button>`;
    }).join("");
    return `<div class="tl-sm-grid" style="--cols:${cols};--gap:${gap}px">${cells}</div>`;
  },
  subjects(d, width) {
    const family = d.family_shares.find((f) => f.id === selectedFamily);
    if (!family) return "";
    const cols = width < 520 ? 2 : width < 700 ? 3 : 4;
    const gap = width < 700 ? 20 : 28;
    const cellWidth = Math.floor((width - gap * (cols - 1)) / cols);
    const bands = family.bands.map((index) => [index, d.bands[index]]);
    const top = niceTop(Math.max(...bands.flatMap(([, band]) => band.shares.filter((v) => v !== null))), 0.05);
    const cells = bands.map(([index, band], k) => {
      const on = index === selectedBand;
      const chart = smallMultiple(d.band_years, band.shares, band.thin, band.name, { width: cellWidth, height: width < 700 ? 66 : 80, top, ticks: [0, top], yLabels: k % cols === 0 });
      return `<button type="button" class="tl-sm small${on ? " on" : ""}${band.id.endsWith("_other") ? " other" : ""}" data-tl-band="${index}" aria-pressed="${on}"><span class="tl-sm-head"><span class="tl-sm-name">${esc(band.name)}</span><span class="tl-sm-share">${pct(latestShare(band.shares))}</span></span>${chart}</button>`;
    }).join("");
    const band = d.bands[selectedBand];
    if (bands.length === 1) {
      return `<div class="tl-subjects"><div class="tl-subjects-head"><h4>${esc(family.name)}</h4><p>One theme${family.id === "nature" ? ": killer plants, storms and other natural forces are counted with the animal attacks" : ""}.</p></div>${filmStrip(d, band)}</div>`;
    }
    const posters = band?.family === family.id ? filmStrip(d, band) : "";
    return `<div class="tl-subjects"><div class="tl-subjects-head"><h4>${esc(family.name)}, by theme</h4><p>Share of all horror films. Select a theme to see its films.</p></div><div class="tl-sm-grid" style="--cols:${cols};--gap:${gap}px">${cells}</div>${posters}</div>`;
  },
  movers(d, width) {
    const { before, after } = d.movers;
    const rows = d.bands.filter((band) => !band.id.endsWith("_other")).sort((a, b) => (b.share_after - b.share_before) - (a.share_after - a.share_before));
    const narrow = width < 520;
    const labelWidth = narrow ? 0 : Math.min(210, Math.round(width * 0.3));
    const rowHeight = narrow ? 40 : 28;
    const m = { top: 8, right: 16, bottom: 28 };
    const height = m.top + rows.length * rowHeight + m.bottom;
    const max = Math.ceil(Math.max(...rows.flatMap((band) => [band.share_before, band.share_after])) * 20) / 20;
    const x = scale(0, max, labelWidth + 8, width - m.right - 28);
    const ticks = [];
    for (let tick = 0; tick <= max + 1e-9; tick += 0.05) ticks.push(tick);
    const marks = rows.map((band, index) => {
      const y = m.top + index * rowHeight + (narrow ? 28 : rowHeight / 2);
      const up = band.share_after > band.share_before;
      const tip = `<strong>${esc(band.name)}</strong><span>${span(...before)}: ${pct(band.share_before)}</span><span>${span(...after)}: ${pct(band.share_after)}</span>`;
      const label = narrow
        ? `<text class="tl-row-label" x="0" y="${y - 12}">${esc(band.name)}</text>`
        : `<text class="tl-row-label" x="${labelWidth}" y="${y + 4}" text-anchor="end">${esc(band.name)}</text>`;
      return `<g data-tip="${attr(tip)}"><rect class="tl-hit" x="0" y="${y - rowHeight / 2}" width="${width}" height="${rowHeight}"/>${label}
        <line class="${up ? "tl-link" : "tl-link-down"}" x1="${x(band.share_before)}" x2="${x(band.share_after)}" y1="${y}" y2="${y}"/>
        <circle class="tl-ring" cx="${x(band.share_before)}" cy="${y}" r="4.5"/>
        <circle class="tl-dot ${up ? "tl-up" : "tl-down"}" cx="${x(band.share_after)}" cy="${y}" r="5.5"/>
        <text class="tl-change ${up ? "up" : "down"}" x="${x(Math.max(band.share_before, band.share_after)) + 10}" y="${y + 4}">${up ? "+" : "−"}${(Math.abs(band.share_after - band.share_before) * 100).toFixed(1)}</text></g>`;
    }).join("");
    return `<div class="tl-legend"><span><i class="tl-key tl-key-ring"></i>${before[0]}–${before[1]}</span><span><i class="tl-key" style="background:${ACCENT}"></i>grew by ${after[0]}–${String(after[1]).slice(2)}</span><span><i class="tl-key" style="background:${SECOND}"></i>shrank by ${after[0]}–${String(after[1]).slice(2)}</span></div>
    <svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Share of horror films in each subject, ${before[0]}–${before[1]} against ${after[0]}–${after[1]}">
      ${ticks.map((tick) => `<line class="tl-grid" x1="${x(tick)}" x2="${x(tick)}" y1="${m.top}" y2="${height - m.bottom}"/><text class="tl-axis" x="${x(tick)}" y="${height - m.bottom + 18}" text-anchor="middle">${Math.round(tick * 100)}%</text>`).join("")}
      ${marks}
    </svg>`;
  },

  volume(d, width) {
    const v = d.volume;
    const keep = v.years.map((year, i) => i).filter((i) => v.years[i] >= 1930 && v.share_notable[i] !== null);
    const years = keep.map((i) => v.years[i]);
    const notable = keep.map((i) => v.share_notable[i]);
    const height = width < 600 ? 240 : 280;
    const m = { top: 24, right: 12, bottom: 28, left: 8 };
    const max = Math.ceil(Math.max(...notable) * 20) / 20;
    const x = scale(years[0], years.at(-1), m.left, width - m.right);
    const y = scale(0, max, height - m.bottom, m.top);
    const ticks = [];
    for (let tick = 0; tick <= max + 1e-9; tick += 0.05) ticks.push(tick);
    const mean = (from, to) => { const rows = years.map((year, i) => [year, notable[i]]).filter(([year]) => year >= from && year <= to); return rows.reduce((sum, [, share]) => sum + share, 0) / rows.length; };
    const plateaus = [[1970, 1990], [1995, years.at(-1)]].map(([from, to]) => ({ from, to, share: mean(from, to) }));
    const marks = plateaus.map((plateau) => `<line class="tl-plateau" x1="${x(plateau.from)}" x2="${x(plateau.to)}" y1="${y(plateau.share)}" y2="${y(plateau.share)}"/><text class="tl-annot" x="${(x(plateau.from) + x(plateau.to)) / 2}" y="${y(Math.max(...notable.filter((_, i) => years[i] >= plateau.from && years[i] <= plateau.to))) - 8}" text-anchor="middle">${plateau.from}–${String(plateau.to).slice(2)}: ${pct(plateau.share)}</text>`).join("");
    const hits = hoverColumns(years, x, m.top, height - m.bottom, (i) => `<strong>${years[i]}</strong><span>${pct(notable[i])} of films with 20+ votes</span><span>${num(v.horror_notable[keep[i]])} horror films with 20+ votes that year</span>`);
    return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Horror's share of films with at least 20 TMDB votes, per year since 1930.">
      ${gridY(ticks, y, m.left, width - m.right, (value) => `${Math.round(value * 100)}%`)}
      <path class="tl-line" style="stroke:${ACCENT}" d="${linePath(notable, x, y, years)}"/>
      ${marks}${hits}
      ${axisX(yearTicks(years[0], years.at(-1), width), x, height - m.bottom)}
    </svg>`;
  },

  threats(d, width) {
    const { years, series } = d.threats;
    const narrow = width < 560;
    // Eras sit in lanes above the plot; an era whose bar or label would overlap the one
    // before it in a lane takes the next lane.
    const ex = scale(years[0], years.at(-1), 8, width - 12);
    const lanes = [];
    const eras = ERAS.filter((era) => era.to >= years[0]).map((era) => {
      const label = narrow ? era.short : `${era.label} · ${era.film}`;
      const start = ex(Math.max(era.from, years[0]));
      const end = Math.max(ex(Math.min(era.to, years.at(-1))), start + label.length * 6.2 + 10);
      let lane = lanes.findIndex((edge) => edge + 4 < start);
      if (lane < 0) lane = lanes.length;
      lanes[lane] = end;
      return { ...era, lane };
    });
    const strip = lanes.length * 18 + 6;
    const height = (narrow ? 260 : 320) + strip;
    const m = { top: 30 + strip, right: 12, bottom: 28, left: 8 };
    const max = Math.ceil(Math.max(...series.flatMap((s) => s.values.filter((v) => v !== null))) * 10) / 10;
    const x = scale(years[0], years.at(-1), m.left, width - m.right);
    const y = scale(0, max, height - m.bottom, m.top);
    const ticks = Array.from({ length: Math.round(max * 10) + 1 }, (_, i) => i / 10);
    const lines = series.map((s) => `<path class="tl-line" style="stroke:${THREAT_COLORS[s.key]}" d="${linePath(s.values, x, y, years)}"/>`).join("");
    // Peak labels, centred on their dot unless near an edge; when two centred labels would
    // overlap, the earlier one moves left of its dot and the later one right of its own.
    // On phones the legend names the series, so a label is just the peak.
    const peaks = series.map((s) => {
      const text = narrow ? `${pct(s.peak.share)} in ${s.peak.year}` : `${s.label}: ${pct(s.peak.share)} in ${s.peak.year}`;
      return { s, text, room: text.length * 7.2, px: x(s.peak.year), py: y(s.peak.share), dx: 0, dy: -10 };
    }).sort((a, b) => a.px - b.px);
    const place = (p, anchor, dx) => { p.anchor = anchor; p.dx = dx; };
    peaks.forEach((p) => place(p, p.px + p.room / 2 > width ? "end" : p.px - p.room / 2 < 36 ? "start" : "middle", 0));
    const extent = (q) => (q.anchor === "middle" ? [q.px - q.room / 2, q.px + q.room / 2] : q.anchor === "end" ? [q.px - q.room, q.px] : [q.px, q.px + q.room]);
    peaks.forEach((p, i) => peaks.slice(i + 1).forEach((next) => {
      if (Math.abs(next.py + next.dy - p.py - p.dy) >= 16 || extent(p)[1] + 8 <= extent(next)[0]) return;
      if (p.px - p.room - 8 >= 8) { place(p, "end", -8); place(next, "start", 8); return; }
      // No room on the left: the later label goes below its dot instead.
      next.dy = 22;
    }));
    const labels = peaks.map(({ s, text, px, py, anchor, dx, dy }) => `<circle class="tl-dot" cx="${px}" cy="${py}" r="4" style="fill:${THREAT_COLORS[s.key]}"/><text class="tl-annot" x="${px + dx}" y="${py + dy}" text-anchor="${anchor}">${text}</text>`).join("");
    const hits = hoverColumns(years, x, m.top, height - m.bottom, (index) => `<strong>${years[index]}</strong>` + series.map((s) => `<span><i class="tl-key" style="background:${THREAT_COLORS[s.key]}"></i>${s.label}: ${pct(s.values[index])}</span>`).join(""));
    return `<div class="tl-legend">${series.map((s) => `<span><i class="tl-key tl-key-line" style="background:${THREAT_COLORS[s.key]}"></i>${s.label}</span>`).join("")}</div>
    <svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Line chart of the share of horror films by source of threat, ${years[0]} to ${years.at(-1)}.">
      ${eras.map((era) => `<rect class="tl-era-band" x="${x(Math.max(era.from, years[0]))}" y="${m.top - 6}" width="${x(Math.min(era.to, years.at(-1))) - x(Math.max(era.from, years[0]))}" height="${height - m.bottom - m.top + 6}"/><line class="tl-era" x1="${x(Math.max(era.from, years[0]))}" x2="${x(Math.min(era.to, years.at(-1)))}" y1="${era.lane * 18 + 14}" y2="${era.lane * 18 + 14}"/><text class="tl-era-label" x="${x(Math.max(era.from, years[0]))}" y="${era.lane * 18 + 10}">${narrow ? era.short : `${era.label} · <tspan class="tl-era-film">${era.film}</tspan>`}</text>`).join("")}
      ${gridY(ticks, y, m.left, width - m.right, (v) => `${Math.round(v * 100)}%`)}
      ${lines}${labels}${hits}
      ${axisX(yearTicks(years[0], years.at(-1), width), x, height - m.bottom)}
    </svg>`;
  },

  geography(d, width) {
    // One small area chart per country: its share of each decade's horror films, on its
    // own scale (the peak is labelled), countries ordered by their peak share.
    const { decades, countries, totals } = d.geography;
    // Decades with fewer than 300 horror films listed are drawn dotted and are never the peak.
    const thin = totals.map((total) => total < 300);
    const peakOf = (shares) => shares.reduce((best, v, i) => (!thin[i] && (best < 0 || v > shares[best]) ? i : best), -1);
    const cols = width < 520 ? 2 : width < 700 ? 3 : 4;
    const gap = width < 640 ? 20 : 26;
    const cellWidth = Math.floor((width - gap * (cols - 1)) / cols);
    const ordered = [...countries].sort((a, b) => b.shares[peakOf(b.shares)] - a.shares[peakOf(a.shares)]);
    const cells = ordered.map((country) => {
      const peak = country.shares[peakOf(country.shares)];
      const at = decades[peakOf(country.shares)];
      const top = niceTop(Math.max(...country.shares), 0.05);
      const chart = smallMultiple(decades, country.shares, thin, country.name, { width: cellWidth, height: width < 640 ? 64 : 74, top, ticks: [0, top], yLabels: false, peak: [at, peak], when: (decade) => `the ${decade}s` });
      return `<div class="tl-sm static"><span class="tl-sm-head"><span class="tl-sm-name">${country.name}</span></span>${chart}</div>`;
    }).join("");
    return `<div class="tl-sm-grid tl-geo" style="--cols:${cols};--gap:${gap}px">${cells}</div>`;
  },

  vocabulary(d, width) {
    // A ridgeline: one curve per decade's signature keyword, its share of each decade's
    // tagged films scaled to its own peak, ordered by the decade it peaks in.
    const decades = d.vocabulary.decades.map((row) => row.decade);
    const narrow = width < 520;
    const label = narrow ? 104 : 150;
    const right = 46;
    const rowH = narrow ? 30 : 34;
    const rise = rowH * 1.5;
    const rows = [...d.vocabulary.trajectories].sort((a, b) => a.peak_decade - b.peak_decade);
    const x = scale(decades[0], decades.at(-1), label, width - right);
    const height = rows.length * rowH + rise + 22;
    const body = rows.map((row, i) => {
      const base = rise + i * rowH + rowH - 4;
      const peak = Math.max(...row.shares.filter((v) => v !== null));
      const weak = (d.vocabulary.decades.find((r) => r.decade === row.peak_decade)?.terms[0]?.z || 0) < 7;
      const pts = row.shares.map((v, k) => `${x(decades[k]).toFixed(1)},${(base - ((v || 0) / peak) * rise).toFixed(1)}`);
      const path = `M${x(decades[0])},${base}L${pts.join("L")}L${x(decades.at(-1))},${base}Z`;
      const pk = row.shares.indexOf(peak);
      const tip = `<strong>‘${esc(row.term)}’</strong>${row.shares.map((v, k) => `<span>${decades[k]}s: ${v === null ? "–" : `${(v * 100).toFixed(1)}%`}</span>`).join("")}`;
      return `<g class="tl-ridge${weak ? " weak" : ""}" data-tip="${attr(tip)}"><path class="tl-ridge-area" d="${path}"/><path class="tl-ridge-line" d="M${pts.join("L")}"/><circle class="tl-ridge-peak" cx="${x(decades[pk])}" cy="${base - rise}" r="3"/><text class="tl-row-label" x="0" y="${base - 2}">${esc(row.term)}</text><text class="tl-axis" x="${width - right + 8}" y="${base - 2}">${(peak * 100).toFixed(peak < 0.1 ? 1 : 0)}%</text></g>`;
    }).join("");
    const axis = decades.map((decade, i) => ((narrow || width < 640) && i % 2 ? "" : `<text class="tl-axis" x="${x(decade)}" y="${height - 4}" text-anchor="middle">${narrow ? `’${String(decade).slice(2)}` : `${decade}s`}</text>`)).join("");
    return `<div class="tl-legend"><span>Each curve is scaled to its own peak; the number gives the peak share of tagged films</span><span class="tl-legend-note">faded: less distinctive</span></div><svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Each decade's signature keyword, traced across all decades">${body}${axis}</svg>`;
  },
  signatures(d) {
    // A card per country: its signature theme, how much more often it makes it than the
    // world, and its best-known film in that theme.
    const name = Object.fromEntries(d.bands.map((band) => [band.id, band.name]));
    const cards = d.signatures.filter((row) => row.ratio >= 1.8).map((row) => `<div class="tl-sig">
      ${row.example?.poster ? filmBlock(d, row.example.id, "tl-sig-poster", `data-tip="${attr(`<strong>${esc(row.example.title)}</strong><span>${row.example.year}</span>`)}"`, `<img src="${POSTER}${esc(row.example.poster)}" alt="${esc(row.example.title)}" loading="lazy">`) : ""}
      <div class="tl-sig-body"><span class="tl-sig-country">${esc(row.name)}</span><strong class="tl-sig-ratio">×${row.ratio >= 4.5 ? Math.round(row.ratio) : row.ratio.toFixed(1)}</strong><span class="tl-sig-theme">${esc(name[row.theme])}</span><span class="tl-sig-share">${pct(row.share)} of its horror films · ${pct(row.world)} worldwide</span>${row.example ? `<span class="tl-sig-film">e.g. ${filmLink(d, row.example)} (${row.example.year})</span>` : ""}</div>
    </div>`).join("");
    return `<div class="tl-sigs">${cards}</div>`;
  },
  canon(d, width) {
    // Diverging bars: how much more or less often each theme appears among famous films
    // than among all horror films from the same decades.
    const rc = d.reach;
    const name = Object.fromEntries(d.bands.map((band) => [band.id, band.name]));
    const rows = Object.keys(rc.expected_mix).filter((id) => rc.expected_mix[id] >= 0.006).map((id) => ({ id, change: (rc.canon_mix[id] || 0) / rc.expected_mix[id] - 1 })).sort((a, b) => b.change - a.change);
    const narrow = width < 520;
    const label = narrow ? 138 : 200;
    const rowH = 22;
    const height = rows.length * rowH + 26;
    const lim = Math.min(2, Math.max(...rows.map((row) => Math.abs(row.change))));
    const x = scale(-lim, lim, label, width - 44);
    const body = rows.map((row, i) => {
      const y = i * rowH + 4;
      const v = Math.max(-lim, Math.min(lim, row.change));
      const up = row.change > 0;
      const tip = `<strong>${esc(name[row.id])}</strong><span>${pct(rc.canon_mix[row.id] || 0)} of famous films</span><span>${pct(rc.expected_mix[row.id])} of all films from the same decades</span>`;
      const text = `${up ? "+" : "−"}${Math.round(Math.abs(row.change) * 100)}%`;
      return `<g data-tip="${attr(tip)}"><text class="tl-row-label" x="0" y="${y + 14}">${esc(name[row.id])}</text><rect class="tl-div ${up ? "up" : "down"}" x="${Math.min(x(0), x(v))}" y="${y + 3}" width="${Math.abs(x(v) - x(0))}" height="${rowH - 7}" rx="2"/><text class="tl-change ${up ? "up" : "down"}" x="${up ? x(v) + 6 : x(v) - 6}" y="${y + 14}" text-anchor="${up ? "start" : "end"}">${text}</text><rect class="tl-hit" x="0" y="${y}" width="${width}" height="${rowH}"/></g>`;
    }).join("");
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="How much more or less often each theme appears among famous horror films"><line class="tl-base" x1="${x(0)}" x2="${x(0)}" y1="0" y2="${height - 20}"/><text class="tl-axis" x="${x(0)}" y="${height - 4}" text-anchor="middle">as often as in all films</text>${body}</svg>`;
  },
  reach(d, width) {
    // Fame (Wikipedia editions) against TMDB rating, one dot per film; a few named.
    const rc = d.reach;
    const height = width < 640 ? 260 : 320;
    const m = { top: 12, right: 12, bottom: 30, left: 30 };
    const maxLinks = Math.max(...rc.points.map((p) => p[4]));
    const x = scale(0, Math.sqrt(maxLinks), m.left, width - m.right);
    const y = scale(2, 9, height - m.bottom, m.top);
    const famous = rc.points.filter((p) => p[4] >= rc.famous_links);
    const named = new Set([
      ...[...rc.points].sort((a, b) => b[4] - a[4]).slice(0, 2),
      ...[...famous].sort((a, b) => a[3] - b[3]).slice(0, 1),
      ...rc.points.filter((p) => p[1] === "Saw" && p[2] === 2004),
    ]);
    const dots = rc.points.map((p) => `<circle class="tl-reach-dot${p[4] >= rc.famous_links ? " famous" : ""}" cx="${x(Math.sqrt(p[4])).toFixed(1)}" cy="${y(p[3]).toFixed(1)}" r="${p[4] >= rc.famous_links ? 3 : 2}"${dotLink(d, p[0])} data-tip="${attr(`<strong>${esc(p[1])} (${p[2]})</strong><span>Rated ${p[3].toFixed(1)} · Wikipedia in ${p[4]} languages</span>`)}"/>`).join("");
    const posters = Object.fromEntries((rc.named || []).map((row) => [row.id, row.poster]));
    // Named films get a numbered ring on the chart and a card below it.
    const marked = [...named].sort((a, b) => b[4] - a[4]);
    const labels = marked.map((p, i) => `<circle class="tl-reach-ring" cx="${x(Math.sqrt(p[4]))}" cy="${y(p[3])}" r="7"/><text class="tl-reach-n" x="${x(Math.sqrt(p[4]))}" y="${y(p[3]) - 11}" text-anchor="middle">${i + 1}</text>`).join("");
    const cards = `<div class="tl-reach-cards">${marked.map((p, i) => filmBlock(d, p[0], "tl-reach-card", "", `${posters[p[0]] ? `<img src="${POSTER}${esc(posters[p[0]])}" alt="" loading="lazy">` : ""}<span><b>${i + 1}</b> ${esc(p[1])} (${p[2]})<small>${p[3].toFixed(1)} on TMDB · ${p[4]} languages</small></span>`)).join("")}</div>`;
    const xTicks = [0, 10, 40, 100].filter((t) => t <= maxLinks).map((t) => `<text class="tl-axis" x="${x(Math.sqrt(t))}" y="${height - 12}" text-anchor="middle">${t}</text>`).join("");
    const yTicks = [2, 4, 6, 8].map((t) => `<line class="tl-grid" x1="${m.left}" x2="${width - m.right}" y1="${y(t)}" y2="${y(t)}"/><text class="tl-axis" x="${m.left - 6}" y="${y(t) + 4}" text-anchor="end">${t}</text>`).join("");
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="TMDB rating against the number of Wikipedia languages with an article, per film">${yTicks}${xTicks}<text class="tl-axis" x="${width - m.right}" y="${height}" text-anchor="end">Wikipedia languages with an article →</text>${dots}${labels}</svg>${cards}`;
  },
  franchises(d, width) {
    // Small multiples: each franchise's entries by release year, rated on TMDB; the first
    // film is ringed, comebacks after a long gap are hollow.
    const all = d.franchises.franchises;
    const cols = width < 520 ? 2 : width < 900 ? 3 : 4;
    const shown = showAllFranchises ? all : all.slice(0, cols * 4);
    const gap = width < 640 ? 16 : 24;
    const cellWidth = Math.floor((width - gap * (cols - 1)) / cols);
    const height = width < 640 ? 92 : 104;
    const ratings = shown.flatMap((f) => f.entries.map((e) => e.tmdb));
    const [lo, hi] = [Math.floor(Math.min(...ratings)), Math.ceil(Math.max(...ratings))];
    const cells = shown.map((f, index) => {
      const left = index % cols === 0 ? 22 : 4;
      const x = scale(f.entries[0].year, Math.max(f.entries.at(-1).year, f.entries[0].year + 1), left + 6, cellWidth - 8);
      const y = scale(lo, hi, height - 18, 8);
      const grid = [...new Set([lo, Math.round((lo + hi) / 2), hi])].map((v) => `<line class="tl-grid" x1="${left}" x2="${cellWidth}" y1="${y(v)}" y2="${y(v)}"/>${index % cols === 0 ? `<text class="tl-axis" x="0" y="${y(v) + 4}">${v}</text>` : ""}`).join("");
      const path = f.entries.map((e, i) => `${i ? "L" : "M"}${x(e.year).toFixed(1)},${y(e.tmdb).toFixed(1)}`).join("");
      const dots = f.entries.map((e, i) => {
        const tip = `<strong>${esc(e.title)} (${e.year})</strong><span>TMDB ${e.tmdb.toFixed(1)}${e.movielens !== null ? ` · MovieLens ${e.movielens.toFixed(1)}` : ""}</span>${e.comeback ? "<span>Sequel after a 10+ year break</span>" : ""}`;
        return `<circle class="tl-fr-dot${i === 0 ? " first" : ""}${e.comeback ? " comeback" : ""}" cx="${x(e.year).toFixed(1)}" cy="${y(e.tmdb).toFixed(1)}" r="${i === 0 ? 4.5 : 3.2}"${dotLink(d, e.id)} data-tip="${attr(tip)}"/>`;
      }).join("");
      const years = `<text class="tl-axis" x="${left + 6}" y="${height - 2}">${f.entries[0].year}</text><text class="tl-axis" x="${cellWidth - 8}" y="${height - 2}" text-anchor="end">${f.entries.at(-1).year}</text>`;
      return `<div class="tl-fr"><p class="tl-fr-name">${esc(f.name)}</p><svg width="${cellWidth}" height="${height}" viewBox="0 0 ${cellWidth} ${height}" role="img" aria-label="${esc(f.name)}: TMDB rating of each film">${grid}<path class="tl-fr-line" d="${path}"/>${dots}${years}</svg></div>`;
    }).join("");
    return `<div class="tl-legend"><span><i class="tl-key" style="background:${ACCENT}"></i>Original film</span><span><i class="tl-key tl-key-open"></i>Sequel after a 10+ year break</span><span>TMDB rating out of 10</span></div><div class="tl-fr-grid" style="--cols:${cols};--gap:${gap}px">${cells}</div>${all.length > shown.length || showAllFranchises ? `<button type="button" class="tl-more" data-tl-franchises>${showAllFranchises ? "Show fewer" : `Show all ${all.length} franchises`}</button>` : ""}`;
  },
  revivals(d, width) {
    const narrow = width < 560;
    const title = (row) => `<div class="tl-rev-title">${filmLink(d, row)} <span>${row.year} · filmed again in ${row.decades} decades</span></div>`;
    if (narrow) {
      // On phones a time axis would stack the posters: each story is an evenly spaced row instead.
      const rows = d.revivals.lineages.map((row) => {
        const items = [{ ...row, root: true }, ...row.returns];
        return `<div class="tl-rev-row">${title(row)}<div class="tl-rev-strip">${items.map((item) => filmBlock(d, item.id, `tl-rev-poster${item.root ? " main" : ""}`, "", `<img src="${POSTER}${esc(item.poster)}" alt="${esc(item.title)} (${item.year})" loading="lazy" width="46" height="69"><span>${item.year}</span>`)).join("")}</div></div>`;
      }).join("");
      return `<div class="tl-legend"><span><i class="tl-key tl-key-ring"></i>Earliest version</span></div>${rows}`;
    }
    const posterW = width < 700 ? 38 : 44;
    const posterH = Math.round(posterW * 1.5);
    const x = scale(1905, 2030, posterW / 2, width - posterW / 2);
    const rows = d.revivals.lineages.map((row) => {
      const items = [{ ...row, root: true }, ...row.returns];
      let lastLeft = -Infinity;
      let lift = false;
      const placed = items.map((item) => {
        const left = x(item.year) - posterW / 2;
        lift = left - lastLeft < posterW + 2 ? !lift : false;
        lastLeft = left;
        const tip = `<strong>${esc(item.title)}</strong><span>${item.year}${item.root ? " · earliest version" : ""}</span>`;
        return filmBlock(d, item.id, `tl-rev-poster${item.root ? " main" : ""}${lift ? " lift" : ""}`, `style="left:${left.toFixed(1)}px;width:${posterW}px" data-tip="${attr(tip)}"`, `<img src="${POSTER}${esc(item.poster)}" alt="${esc(item.title)} (${item.year})" loading="lazy" width="${posterW}" height="${posterH}"><span>${item.year}</span>`);
      }).join("");
      return `<div class="tl-rev-row">${title(row)}<div class="tl-rev-track" style="height:${posterH + 40}px">${placed}</div></div>`;
    }).join("");
    const ticks = yearTicks(1910, 2030, width);
    return `<div class="tl-legend"><span><i class="tl-key tl-key-ring"></i>Earliest version</span></div>${rows}<div class="tl-rev-axis">${ticks.map((tick) => `<span style="left:${x(tick).toFixed(1)}px">${tick}</span>`).join("")}</div>`;
  },

  crosswalk(d, width) {
    const m = d.methods;
    const narrow = width < 640;
    const labelWidth = narrow ? 150 : 210;
    // Longest label (in characters) that fits the label column at the top level.
    const maxName = narrow ? 21 : 30;
    const gap = 6;
    const types = Object.keys(m.source_types);
    const cols = [];
    const cw = Math.max(12.5, Math.min(15, (width - labelWidth - gap * 3) / m.sources.length));
    m.sources.forEach((source, i) => { cols[i] = labelWidth + i * cw + gap * types.indexOf(source.type) + cw / 2; });
    const top = narrow ? 30 : 118;
    const rowHeight = 17;
    const rows = m.crosswalk;
    const height = top + rows.length * rowHeight + 6;
    const svgWidth = cols.at(-1) + cw;
    const typeHeads = types.map((type) => {
      const xs = cols.filter((_, i) => m.sources[i].type === type);
      return `<text class="tl-axis tl-strong" x="${(xs[0] + xs.at(-1)) / 2}" y="12" text-anchor="middle">${narrow ? type : m.source_types[type]}</text><line class="tl-grid" x1="${xs[0] - 5}" x2="${xs.at(-1) + 5}" y1="17" y2="17"/>`;
    }).join("");
    const heads = narrow ? "" : m.sources.map((source, i) => `<text class="tl-axis tl-small" transform="translate(${cols[i] + 3},${top - 6}) rotate(-60)">${esc(source.name.replace("Wikipedia", "WP").slice(0, 24))}</text>`).join("");
    const body = rows.map((row, r) => {
      const y = top + r * rowHeight;
      const ok = row.types.length >= 2;
      const tip = `<strong>${esc(row.name)}</strong><span>${row.sources.length ? `Listed by ${row.sources.length} source${row.sources.length === 1 ? "" : "s"} (${row.types.split("").map((t) => m.source_types[t]).join(", ")})` : "Named by no source; added while grouping"}</span>${row.band ? `<span>Counted in: ${esc(row.band)}</span>` : ""}`;
      return `<g data-tip="${attr(tip)}">${row.depth === 0 ? `<rect x="0" y="${y}" width="${svgWidth}" height="${rowHeight}" class="tl-xw-family"/>` : ""}
        <rect x="${4 + row.depth * 11}" y="${y + 4}" width="9" height="9" rx="2" class="${ok ? "tl-xw-pass" : "tl-xw-fail"}"/>
        <text class="tl-row-label${row.depth === 0 ? " tl-strong" : ""}" x="${18 + row.depth * 11}" y="${y + 12.5}">${esc(row.name.length > maxName - row.depth * 2 ? `${row.name.slice(0, maxName - row.depth * 2 - 1).trimEnd()}…` : row.name)}</text>
        ${cols.map((cx, i) => `<circle cx="${cx}" cy="${y + rowHeight / 2}" r="${row.sources.includes(i) ? 3.4 : 1}" class="${row.sources.includes(i) ? "tl-xw-dot" : "tl-xw-empty"}"/>`).join("")}
        <rect class="tl-hit" x="0" y="${y}" width="${svgWidth}" height="${rowHeight}"/></g>`;
    }).join("");
    return `<div class="tl-legend"><span><i class="tl-key tl-key-square"></i>listed by 2+ kinds of source</span><span><i class="tl-key tl-key-hollow"></i>fewer kinds of source</span><span><i class="tl-key" style="background:${ACCENT}"></i>source lists it</span></div>
    <div class="tl-xw-scroll"><svg viewBox="0 0 ${svgWidth} ${height}" width="${svgWidth}" height="${height}" role="img" aria-label="Matrix of subject categories against the sources that list them.">${typeHeads}${heads}${body}</svg></div>`;
  },
};
