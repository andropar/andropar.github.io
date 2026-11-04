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

// Film-industry changes marked on horror's share of cinema (world events are on the threat
// chart). An event with from === to is a single year, drawn as a line; `anchor` places the
// label so neighbours don't overlap, and `title` is the tooltip's longer name.
const EVENTS = [
  { from: 1934, to: 1934, label: "Censorship begins", short: "Censors", title: "Hollywood starts censoring its films (Production Code)", anchor: "start" },
  { from: 1968, to: 1968, label: "Censorship ends", short: "Ratings", title: "A ratings system replaces Hollywood’s censorship", anchor: "end" },
  { from: 1983, to: 1989, label: "Video boom", short: "VHS", title: "Video-rental boom", anchor: "middle" },
];

// Page state, kept across chart redraws.
let data = null;
// undefined until first mount: phones start with no family open.
let selectedFamily;
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
  "Japan 1950": "when Toho’s monster films began",
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

// Themes as they read in prose.
const THEME_PROSE = {
  killers: "killers", ghosts: "ghosts", demons: "demons", psychological: "psychological horror", home_invasion: "home invasion",
  folk_horror: "folk horror", zombies: "zombies", animals: "killer animals", mutation: "mutants", cannibals: "cannibals",
  vampires: "vampires", witchcraft: "witches", shapeshifters: "werewolves", aliens: "aliens", giant_monsters: "giant monsters", techno: "killer machines",
};

// The most-rated film of a theme (or of a whole category, from its themes' films) in a decade.
function decadeFilm(d, bandIds, decade) {
  const films = bandIds.map((i) => d.bands[i].posters?.find((p) => Math.floor(p.year / 10) * 10 === decade)).filter(Boolean);
  return films.reduce((best, p) => (!best || (p.votes || 0) > (best.votes || 0) ? p : best), null);
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

// The franchises that fell hardest from their first film.
function franchiseNames(franchises) {
  const rows = franchises.franchises.map((f) => {
    const [first, ...rest] = f.entries;
    return { name: f.name, first, drop: first.tmdb - rest.reduce((sum, e) => sum + e.tmdb, 0) / rest.length };
  });
  return { hardestFalls: [...rows].sort((a, b) => b.drop - a.drop).slice(0, 3) };
}

// The best-rated version of a remade story, among versions with 100+ votes.
function bestVersion(row) {
  return [row, ...row.returns].filter((film) => film.tmdb && film.votes >= 100).reduce((best, film) => (!best || film.tmdb > best.tmdb ? film : best), null);
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
  const lowest = (rows) => rows.reduce((a, b) => (b[1] < a[1] ? b : a));
  const highest = (rows) => rows.reduce((a, b) => (b[1] > a[1] ? b : a));
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
    // Horror's share of cinema: the post-war low, the all-time high and today.
    postwarLow: lowest(notable.filter(([year]) => year >= 1945 && year <= 1955)),
    volumePeak: highest(notable),
    volumeNow: notable.at(-1),
    oneInNow: words[oneIn(notable.at(-1)[1])] || oneIn(notable.at(-1)[1]),
    all1975: v.share_all[v.years.indexOf(1975)], all2020: v.share_all[v.years.indexOf(2020)],
    // Horror's most common named theme in the latest five-year period.
    topTheme: d.bands.filter((band) => !band.id.endsWith("_other")).reduce((a, b) => (b.period_shares.at(-1) > a.period_shares.at(-1) ? b : a)),
    // Killer films' highest five-year share since the comparison began, and the periods in
    // which ghost films gained three points or more.
    killerPeak: periods.reduce((best, year, i) => (i >= from - 1 && killers.period_shares[i] > killers.period_shares[best] ? i : best), from - 1),
    ghostJumps: periods.map((_, i) => i).filter((i) => i >= from && ghosts.period_shares[i] - ghosts.period_shares[i - 1] >= 0.03),
    threat, unnamedFirst: d.threats.unnamed[d.threats.years.indexOf(d.movers.before[0])], unnamedLast: unnamed.at(-1), unnamedLastYear: d.threats.years[d.threats.unnamed.findLastIndex((value) => value !== null)],
    killerPeakEra: eraOf(killers.peak_year)?.label,
    ...comebackExamples(d.franchises),
    ...canonStats(d),
    signatureText: signatureText(d),
    ...franchiseNames(d.franchises),
    storyBest: bestVersion(d.revivals.lineages[0]),
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
      <p>As a side project, I built <a href="${HORRORVERSE}" target="_blank" rel="noopener">Horrorverse</a>, a recommendation site for horror films. It makes it easy for my friends and me to plan movie nights themed around a film, and it gives me a way to explore the genre and find films picked for my own taste.</p>
      <p>To build it, I put together a catalogue of every horror film I could find: ${num(d.meta.film_count)} of them, from ${d.meta.first_year} to today. With nearly the whole genre in one place, it seemed a waste not to look at it more closely. Film historians have long argued that horror mirrors the anxieties of its time,${cite("skal", "phillips", "wood")} but they make that case from the classics everyone remembers. What do all the others say?</p>
      <p>First, the films had to be sorted into buckets by what makes them scary. I collected ${d.methods.sources.length} published classifications of horror, from film scholarship to film catalogues, and merged their ${num(d.methods.raw_labels)} categories into ${d.bands.length} themes, from vampires and masked killers to aliens and haunted houses. Two AI models then labelled every film from its synopsis, keywords and what they knew about it, and a third settled their disagreements.${wd ? ` As a check, Wikidata’s volunteers tag some films with subgenres such as ‘vampire film’; on films held back for testing, my labels include ${pct(wd.scores.final.recall)} of those tags.` : ""}</p>
      <p class="tl-byline">Data: TMDB, MovieLens, Wikidata · Updated ${updated} · <a href="#tl-methods" data-tl-methods>How I did it</a></p>
    </div>

    <section class="tl-section">
      ${h2("What were horror films about?")}
      <p>The first thing I wanted to know was simple: how much of cinema was horror in each year, and what those films were about.</p>
      <figure class="tl-hero" aria-labelledby="tl-hero-title">
        <figcaption class="tl-fig-head">
          <h3 id="tl-hero-title">A century of horror</h3>
          <p>Five-year rolling averages, ${d.band_years[0]}–${d.band_years.at(-1)}. Hover a chart for each decade’s most-rated film.</p>
        </figcaption>
        <p class="tl-part-head"><strong>Horror’s share of all films</strong> · among films with 20+ ratings on TMDB</p>
        <div class="tl-chart tl-chart-volume" data-tl-chart="volume"></div>
        <p class="tl-part-head"><strong>What horror films were about</strong> · share of horror films in each category. Select one to see its themes.</p>
        <div class="tl-chart" data-tl-chart="families"></div>
        <div data-tl-chart="subjects" aria-live="polite"></div>
        <p class="tl-source">Dotted lines mean fewer than 10 films. Films can belong to several genres.</p>
      </figure>
      <p>A few things stand out right away. The first is how far horror’s share of cinema has swung. Right after the Second World War, almost no films were horror (${pct(s.postwarLow[1])} around ${s.postwarLow[0]}); by ${s.volumePeak[0]}, more than one in five was (${pct(s.volumePeak[1])}). Today it is about one in ${s.oneInNow}. The biggest swings line up with changes in how films were made and shown. Horror’s share halved after Hollywood began censoring its films in 1934, nearly doubled once a ratings system replaced that censorship in 1968, and peaked again during the video-rental boom of the 1980s.</p>
      ${holds("killers") && holds("ghosts") ? `<p>The second is how slowly the slasher faded. <em>Halloween</em> and <em>Friday the 13th</em> made the masked killer the face of 1980s horror,${cite("nowell", "clover")} and killer films peaked at ${pct(s.killers.period_shares[s.killerPeak])} of horror films in the ${part(s.periods[s.killerPeak])}. They have declined ever since, to ${pct(s.killers.period_shares.at(-1))}. Ghost stories rose in ${s.ghostJumps.length === 1 ? "one wave" : `${s.ghostJumps.length === 2 ? "two" : s.ghostJumps.length} waves`}, ${s.ghostJumps.map((i, k) => `${k === 0 ? (s.ghostJumps.length > 1 ? "first " : "") : "then "}in the ${part(s.periods[i])}${JUMPS[s.periods[i]] ? `, ${JUMPS[s.periods[i]]}${JUMP_REFS[s.periods[i]] ? cite(...JUMP_REFS[s.periods[i]]) : ""}` : ""}`).join(", ")}${s.topTheme.id === "ghosts" ? `, and are now horror’s most common theme (${pct(s.ghosts.period_shares.at(-1))})` : ""}.</p>` : ""}
    </section>

    <section class="tl-section">
      ${h2("Does horror mirror the news?")}
      <p>How much horror got made follows the industry. What I was more curious about is whether what it was about follows the news. It’s one of the oldest ideas in writing about the genre: each era’s monsters stand for what that era feared.${cite("skal", "phillips")} Its most systematic version comes from the sociologist Andrew Tudor, who in 1989 sorted nearly 1,000 horror films released in Britain by where their threat comes from.${cite("tudor")} He found fear moving closer to home over the century: away from gothic monsters and mad laboratories, towards the disturbed human mind.</p>
      <p>${holds("science_peak") ? `Across all ${num(d.meta.film_count)} films, the first half of his story holds. In the 1950s, the decade of H-bomb tests and Sputnik, science gone wrong peaked.${cite("skal")} Around ${s.threat.science.peak.year} it was behind nearly half of the horror films with an identifiable threat (${pct(s.threat.science.peak.share)}), from <em>Them!</em> to <em>The Fly</em>, against ${pct(s.threat.science.values.at(-1))} today.` : ""} ${holds("human_peak") ? "From the 1960s through the 1980s, after <em>Psycho</em>, human killers and disturbed minds led, just as Tudor found." : ""}</p>
      <p>${holds("supernatural_half") ? "Then the story turns. Since the 1990s, the supernatural has been behind at least 40% of horror films in every decade, the opposite of where Tudor’s trend pointed." : ""} ${s.after911 === null ? "" : s.after911 >= 0.02 ? "The post-9/11 wave of ‘torture porn’, films like <em>Saw</em> and <em>Hostel</em>, shows up as a short rise in killer films." : `The post-9/11 years are often remembered for ‘torture porn’,${cite("edelstein", "wetmore")} because <em>Saw</em> and <em>Hostel</em> were hits. Across the thousands of other horror films made in the 2000s, killer films held steady at ${pct(s.killersBefore911)}; the growth was in ghosts.`}</p>
      ${figure("threats", "Where the threat comes from", "Share of horror films by source of threat, where the threat is identifiable; five-year rolling average", "Historical eras based on Skal, Wood, Clover, McRoy and Wetmore; threat categories adapted from Tudor (see references).")}
    </section>

    <section class="tl-section">
      ${h2("How do people describe each decade?")}
      <p>I also wanted to see how people describe each decade. On TMDB, users tag films with keywords, and some tags turn up far more often in one decade than in any other. ‘Mad scientist’ peaks in the 1940s and fades by the 1960s; ‘slasher’ defines the 1980s and remains a staple; ‘found footage’ takes over in the 2010s. Most of these tags were added in recent years, so they show how we remember each era today.</p>
      ${figure("vocabulary", "Each decade’s signature keyword", "The tag most distinctive of each decade, traced across all decades", "TMDB user keywords, most of them added in recent years.")}
    </section>

    ${d.reach ? `<section class="tl-section">
      ${h2("Do the famous films tell the whole story?")}
      <p>Histories of horror are written from the films people remember: the hits, the classics, the films that get remade and taught. I wanted to know whether those films are a fair sample. If they are, the histories hold. If not, whole trends can go unnoticed.</p>
      <p>They are not a fair sample. Take the ${num(d.reach.canon_films)} horror films with Wikipedia articles in at least ${d.reach.canon_links} languages, the ones historians write about and everyone has heard of. Compared with all horror films from the same decades, they hold ${s.canonGhosts.ratio < 0.8 ? `a third fewer ghost stories (${pct(s.canonGhosts.canon)} instead of ${pct(s.canonGhosts.expected)})` : `about as many ghost stories (${pct(s.canonGhosts.canon)} against ${pct(s.canonGhosts.expected)})`}, but far more spectacle: ${list(s.canonOver.map((row) => `${row.ratio.toFixed(1)} times as many ${THEME_PROSE[row.id]}`))}.</p>
      ${figure("canon", "What the famous films over- and under-represent", `How much more or less often each theme appears among films with Wikipedia articles in ${d.reach.canon_links}+ languages than among all horror films from the same decades; themes within 20% are left out`, "")}
      <p>At the other end, horror keeps growing in films almost no one sees. Counting every film on TMDB, not just those with 20 ratings, horror’s share of cinema rose from ${pct(s.all1975)} in 1975 to ${pct(s.all2020)} in 2020: a flood of micro-budget films.${d.reach.flood ? ` Much of that flood is ghost stories: since 2010, ${pct(d.reach.flood.unrated.ghosts)} of the films too obscure to have 20 ratings are about ghosts, against ${pct(d.reach.flood.rated.ghosts)} of the rest.` : ""} The rise of the ghost story happened mostly in films that never became famous.</p>
      <p>Fame and quality only loosely go together. Films with articles in ${d.reach.famous_links} or more languages average ${d.reach.famous_mean.toFixed(1)} on TMDB, against ${d.reach.all_mean.toFixed(1)} for all films with ${d.reach.min_votes}+ ratings, but ${s.notorious ? `${filmLink(d, { id: s.notorious[0], title: s.notorious[1] })} (${s.notorious[2]}) has articles in ${s.notorious[4]} languages at a rating of ${s.notorious[3].toFixed(1)}` : "some famous films rate poorly"}.</p>
      ${figure("reach", "Fame against rating", `TMDB rating of every horror film with ${d.reach.min_votes}+ ratings, against the number of Wikipedia languages with an article on it`, "")}
    </section>` : ""}

    <section class="tl-section">
      ${h2("Which stories keep coming back?")}
      <p>Horror tells the same stories again and again: as remakes of a few classic novels, and as franchises that turn one hit into ten films. I wanted to know which stories come back most often, and whether the later versions are any good.</p>
      <p>${s.novelsLead ? `The oldest stories keep finding new life. Mary Shelley’s <em>Frankenstein</em> has been filmed again in ${r.lineages[0].decades} decades since its first adaptation in ${r.lineages[0].year}, and Bram Stoker’s <em>Dracula</em>, starting with the unauthorised ${film(r.lineages[1])} in ${r.lineages[1].year}, in ${r.lineages[1].decades}.` : `${list(top.map((row) => `${film(row)} (${row.decades} decades)`))}.`} ${r.lineages.length > 3 && r.lineages[2].decades === r.lineages[3].decades ? `${list(r.lineages.slice(2, 4).map((row) => film(row)))} share third place, with ${r.lineages[2].decades} decades each.` : ""}${s.storyBest && s.storyBest.year >= 2000 ? ` A century on, ${s.novelsLead ? "Frankenstein" : esc(r.lineages[0].title)} has not worn out: the ${s.storyBest.year} version is its best-rated yet, at ${s.storyBest.tmdb.toFixed(1)} on TMDB.` : ""}</p>
      <p>Franchises wear out faster. In ${fr.tmdb.first_best} of the ${fr.tmdb.franchises} most-rated horror franchises, the original is still the best-rated film, and the films that follow score ${fr.tmdb.mean_drop >= 0.95 && fr.tmdb.mean_drop < 1.05 ? "a full point" : `${fr.tmdb.mean_drop.toFixed(1)} points`} lower on average on TMDB’s 10-point scale, with the same drop on MovieLens. The hardest falls came after the greatest originals: ${list(s.hardestFalls.map((row) => `<em>${esc(row.name)}</em> (${row.first.tmdb.toFixed(1)}, then ${(row.first.tmdb - row.drop).toFixed(1)} on average)`))}. Coming back after ten years or more is a coin toss: of ${fr.tmdb.comebacks} such films, ${fr.tmdb.comebacks_up} beat the one before them${s.comebackUp ? `, like ${film(s.comebackUp.film)} (${s.comebackUp.film.year}), which climbed to ${s.comebackUp.film.tmdb.toFixed(1)} after <em>${esc(s.comebackUp.previous.title)}</em> scored ${s.comebackUp.previous.tmdb.toFixed(1)}` : ""}.</p>
      ${figure("stories", "Stories told again and again", "Classic stories with one later version from each decade they were remade, and the most-rated franchises film by film; the line below the posters is each film’s TMDB rating", "")}
    </section>

    <section class="tl-section">
      ${h2("Where is horror made?")}
      <p>Last, I wanted to know where horror comes from. It’s often treated as a Hollywood genre, and more of it comes from the United States than from anywhere else: it made between ${pct(s.usRange[0])} and ${pct(s.usRange[1])} of each decade’s horror films since 1950. Elsewhere, horror came in national waves: ${s.abroad.map((row) => `${row.name} in the ${row.decade}s${WAVES[`${row.name} ${row.decade}`] ? `, ${WAVES[`${row.name} ${row.decade}`]}${WAVE_REFS[`${row.name} ${row.decade}`] ? cite(WAVE_REFS[`${row.name} ${row.decade}`]) : ""}` : ""} (${pct(row.share)})`).join("; ")}.</p>
      ${figure("geography", "Horror films by country and decade", "Percent of each decade’s horror films made in each country; faded where a decade has fewer than 300 films listed", "TMDB is maintained mostly by English-speaking volunteers, so non-English films are undercounted. Countries shown reached 3% in at least one decade.")}
      ${d.signatures?.length ? `<p>But every film industry has its own monsters. Each country has a signature nightmare: the theme it makes far more often than the world does. ${s.signatureText}</p>
      ${figure("signatures", "Each country’s signature nightmare", "The theme each country makes most often compared with the world, for countries with 200+ labelled films", "")}` : ""}
    </section>

    <section class="tl-section tl-close">
      ${h2("So what were we afraid of?")}
      <p>Seen whole, a century of horror mostly confirms the story historians tell: atomic monsters in the 1950s, human killers and broken minds through the 1980s, the supernatural ever since. Where it differs is in what got noticed.${s.canonGhosts?.ratio < 0.8 ? " The ghost story, the biggest growth of the last forty years, grew mostly in films few people remember." : ""}${s.after911 !== null && s.after911 < 0.02 ? " The post-9/11 torture cycle that dominated the conversation barely moved the numbers." : ""} The famous films are the ones history gets written from. The rest are where much of the genre actually changed.</p>
      <p>To find your own way through them, <a href="${HORRORVERSE}" target="_blank" rel="noopener">Horrorverse</a> maps every one of these films by plot.</p>
    </section>

    ${d.years ? `<aside class="tl-year">
      <label for="tl-year">Before you go: what was horror about the year you were born?</label>
      <div class="tl-year-pick">
        <button type="button" data-tl-year-step="-1" aria-label="One year earlier">−</button>
        <input type="range" id="tl-year" data-tl-year min="${Object.keys(d.years)[0]}" max="${Object.keys(d.years).at(-1)}" step="1" value="${selectedYear}">
        <button type="button" data-tl-year-step="1" aria-label="One year later">+</button>
        <output class="tl-year-num" for="tl-year">${selectedYear}</output>
      </div>
      <p class="tl-year-out" aria-live="polite">${yearCard(d, selectedYear)}</p>
    </aside>` : ""}

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
  const subjects = Object.values(final.subjects);
  const tags = subjects.reduce((sum, row) => sum + row.films, 0);
  const passed = subjects.filter((row) => row.judged && row.passes).length;
  const failed = subjects.filter((row) => row.judged && !row.passes).length;
  const checkRows = Object.entries(final.subjects).map(([id, row]) => `<tr><th scope="row">${esc(name[id])}</th><td>${num(row.films)}</td><td>${pct(before.subjects[id]?.recall)}</td><td>${pct(row.recall)}</td><td>${row.judged ? check(row.passes ? "pass" : "fail", row.passes ? "passes" : "fails") : '<span class="tl-verdict">too few films</span>'}</td></tr>`).join("")
    + `<tr class="tl-total"><th scope="row">All themes</th><td>${num(tags)}</td><td>${pct(before.recall)}</td><td>${pct(final.recall)}</td><td></td></tr>`;
  const rbChecks = rb.variants.length - 1;
  const words = { 5: "five", 6: "six", 7: "seven" };
  const r = d.revivals;
  const unsourced = m.crosswalk.filter((row) => !row.sources.length);
  const indirect = m.sources.filter((src) => src.verification !== "direct").length;
  const pipeline = [
    [m.sources.length, "sources", "published lists of horror subgenres"],
    [d.bands.length, "themes", `boiled down from ${num(m.raw_labels)} category names`],
    [num(d.meta.labelled_count || v.films - v.unclear), "films labelled", `by two AI models; ${num(v.unclear)} too unclear`],
    [pct(final.recall), "of Wikidata’s tags", `matched, on ${num(final.films)} test films`],
    [`${rb.claims.length} × ${rbChecks}`, "re-counts", `the main trends, in ${words[rbChecks] || rbChecks} versions of the data`],
  ];
  return `
  <section class="tl-methods" id="tl-methods">
    <details class="disclosure tl-methods-fold">
      <summary><span class="tl-methods-summary"><span class="tl-methods-title">How I did it</span><span class="tl-methods-hint">Where the themes come from, how ${num(d.meta.film_count)} films were labelled, and how far to trust the labels</span></span></summary>
      <div class="tl-methods-body">
        <ol class="tl-pipe">${pipeline.map(([value, label, note], i) => `<li><span class="tl-pipe-n">${i + 1}</span><strong>${value}</strong><span class="tl-pipe-label">${label}</span><small>${note}</small></li>`).join("")}</ol>

        <div class="tl-step"><div class="tl-step-num">1</div><div class="tl-step-body">
          <h3>Where the themes come from</h3>
          <p>Rather than invent my own categories, I started from the ones other people use. I collected ${m.sources.length} published lists of horror subgenres: books on horror, encyclopedias (Britannica, the English, German, Spanish and Japanese Wikipedias, and Wikidata), film sites (IMDb, AllMovie, Netflix and Rotten Tomatoes), and books and pages on horror from Japan, Korea, Southeast Asia, India and Latin America. Together they name ${num(m.raw_labels)} categories.</p>
          <p>Not every source could be read in full. For ${indirect} of them I only had the table of contents or another author’s summary, so their categories are chapter headings rather than worked-out definitions.</p>
          <div class="tl-src-grid">${sourceCards}</div>
        </div></div>

        <div class="tl-step"><div class="tl-step-num">2</div><div class="tl-step-body">
          <h3>From ${num(m.raw_labels)} names to ${d.bands.length} themes</h3>
          <p>Many of those names aren’t about what makes a film scary: ‘gothic’ is a style, ‘haunted house’ a setting, ‘1980s horror’ a period. Two AI models went through all ${num(m.raw_labels)} separately and sorted each into subject, setting, style and so on; they made the same call on 97% of them. I kept the subjects and arranged them into a tree whose top level is Andrew Tudor’s question of where the threat comes from: the supernatural, people, science or nature.</p>
          <p>Then I tested the tree. Two models labelled the same ${num(402)} films, and wherever they couldn’t reliably tell two categories apart (an F1 agreement below 0.7), the finer category was folded into the broader one. I also merged a few that the models could tell apart but that describe the same kind of threat, such as possession into demons and haunted places into ghosts. That left ${d.bands.length} themes. ${unsourced.length} categories in the tree, such as death games, weren’t taken from a source but added to cover films the lists miss.</p>
          <figure class="tl-fig tl-fig-crosswalk"><figcaption class="tl-fig-head"><h4>Which sources list each theme</h4><p>Each dot is a source that lists the category. A filled square marks categories listed by at least two kinds of source.</p></figcaption><div class="tl-chart" data-tl-chart="crosswalk"></div></figure>
        </div></div>

        <div class="tl-step"><div class="tl-step-num">3</div><div class="tl-step-body">
          <h3>How each film was labelled</h3>
          <p>Two models, ${v.labellers.join(" and ")}, labelled every film independently. Each saw what a film database says about it: title, year, countries, genres, tagline, the short synopsis from TMDB and up to 12 TMDB keywords. They could also use what they already knew about the film. Both followed the same written guide, with a definition for every theme and rules for hard cases (a Dracula film is a vampire film whatever its setting; a stalking killer is a killer even when supernatural), and gave one to three themes, where the threat comes from, and how sure they were.</p>
          <p>They agreed on the main theme of ${pct(v.main_agreement)} of films. Where they disagreed on the main theme or on the threat, a third model, ${v.adjudicator}, read both answers and decided (${num(v.sources.adjudicated)} films). Where they agreed, only the themes both had given were kept. Films from the same series that still came out inconsistent were reviewed together (${num(v.sources.series)} films). ${num(v.unclear)} films had too little information to label and are left out.</p>
          <p>One limitation runs through all of this. For well-known films the models can draw on what they know; for obscure ones they mostly have a paragraph of synopsis. Labels for obscure films are probably less reliable, and the checks below test them least.</p>
          ${ex ? `<div class="tl-example">
            <div class="tl-example-in"><span class="tl-example-label">What the models saw</span><p><strong>${esc(ex.title)} (${ex.year})</strong> · ${esc(ex.genres.join(", "))}</p><p>${esc(ex.synopsis)}</p><p>Keywords: ${esc(ex.keywords.join(", "))}</p></div>
            <div class="tl-example-arrow" aria-hidden="true">→</div>
            <div class="tl-example-out"><span class="tl-example-label">The label</span><ol>${ex.label_names.map((label) => `<li>${esc(label)}</li>`).join("")}</ol><p>Threat: ${esc(ex.threat)} · confidence: ${esc(ex.confidence)}</p><p class="tl-example-film">The film: ${film(ex)}</p></div>
          </div>` : ""}
          <p>The ${d.bands.length} themes, and the categories each one covers:</p>
          <ul class="tl-bandlist">${m.bands.map((band) => `<li><strong>${esc(band.name)}</strong><span>${esc(band.codes.join(", "))}</span></li>`).join("")}</ul>
        </div></div>

        <div class="tl-step"><div class="tl-step-num">4</div><div class="tl-step-body">
          <h3>How accurate are the labels?</h3>
          <p>To check the models against people, I used Wikidata, where volunteers tag some films with subgenres like ‘vampire film’ or ‘slasher film’. ${num(wd.films_with_subgenre)} of the films carry a tag that matches one of my themes. I split them in half: I looked at one half while writing the labelling guide, and kept the other half, ${num(final.films)} films, for the test. Before scoring, I set ${pct(wd.min_recall)} as the bar a theme had to clear.</p>
          <p>On the test half, my labels include ${pct(final.recall)} of the ${num(tags)} themes Wikidata gives. The table shows each theme: ${passed} pass, ${failed} fall short, and the rest have too few tagged films to judge; several themes have no Wikidata equivalent at all. Psychological horror does worst, partly because Wikidata uses the term loosely: it calls <em>Insidious</em> psychological horror, where my guide keeps the term for films whose threat is the mind itself. ‘First labels’ were an earlier attempt by one smaller model that saw only the synopsis.</p>
          <div class="tl-table-wrap"><table class="tl-table tl-checks"><thead><tr><th scope="col">Theme</th><th scope="col">Tagged films</th><th scope="col">First labels</th><th scope="col">Final labels</th><th scope="col"><span class="visually-hidden">Verdict</span></th></tr></thead><tbody>${checkRows}</tbody></table></div>
          <p>What this check can’t show: whether the models give films themes they shouldn’t have (Wikidata leaves most films untagged, so a missing tag doesn’t mean ‘no’), and how good the labels are for obscure films, which Wikidata rarely tags.</p>
          <p>Wikidata isn’t always right either: it calls <em>Evil Dead</em> (2013) a zombie film.${review.sampled ? ` Shown ${review.sampled} of the ${num(review.disagreements)} films where the two disagree, ${review.model} sided with my labels in ${pct(share("ours"))}, with Wikidata in ${pct(share("wikidata"))}, and called ${pct(share("unsure"))} a matter of taste. ${review.model} also helped make the labels, so this is a sanity check, not independent proof.` : ""}</p>
        </div></div>

        <div class="tl-step"><div class="tl-step-num">5</div><div class="tl-step-body">
          <h3>Do the findings depend on these choices?</h3>
          <p>Any of these choices could tilt the results. So I counted the article’s ${words[rb.claims.length] || rb.claims.length} main trends again in ${words[rbChecks] || rbChecks} other versions of the data: well-known films only (100+ votes), only labels the models were confident about, each film’s main theme only, films from English-speaking countries, films from everywhere else, and the first labels, which saw only the synopsis and not the title, so the model couldn’t use what it knew about a film. A trend is in the article only if it held in all of them. The other findings, such as famous against obscure films, countries, franchises and remakes, weren’t tested this way.</p>
          <div class="tl-table-wrap"><table class="tl-table tl-robust"><thead><tr><th scope="col">Trend</th>${rb.variants.map((variant) => `<th scope="col">${esc(variant)}</th>`).join("")}</tr></thead><tbody>${rb.claims.map((claim) => `<tr class="${claim.holds ? "" : "tl-failed"}"><th scope="row">${esc(claim.text)}${claim.holds ? "" : " <small>(not stated)</small>"}</th>${claim.values.map((value) => `<td class="${value.holds ? "tl-ok" : "tl-no"}">${esc(value.value)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
        </div></div>

        <div class="tl-notes">
          <h3>Notes</h3>
          <p><strong>Films.</strong> The ${num(d.meta.film_count)} films that TMDB or MovieLens list as horror, with TMDB data as of ${new Date(d.meta.built_at).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}. Films that only TMDB lists need a poster and at least five votes to be included, so the most obscure films are undercounted. Genres are today’s: a film counts as horror if it is listed as horror now.</p>
          <p><strong>Shares.</strong> A film with several themes counts partly toward each: half each for two. Shares use a five-year window centred on each year, widened up to fifteen years where there are few films (mostly before 1956); charts end in ${d.band_years.at(-1)}, the last year with a full window.</p>
          <p><strong>Fame.</strong> The number of Wikipedia language editions with an article on the film, from Wikidata; other Wikimedia sites, such as Wikiquote, don’t count.</p>
          <p><strong>Franchises.</strong> TMDB collections with at least four horror films of 50+ votes; the ${d.franchises.tmdb.franchises} with the most votes in total. MovieLens ratings, on a five-point scale, are doubled for comparison and used where 50+ people rated a film.</p>
          <p><strong>Stories that came back.</strong> For each film made by 1985 with 100+ votes, the twelve most similar later synopses (20+ years on; BGE-small embeddings) were judged by Claude Sonnet as remake, same source, retelling, sequel or unrelated (${num(r.checked_pairs)} pairs); Claude Opus then checked every later film against the first film of its row (${num(r.confirmed_accepted)} of ${num(r.confirmed_pairs)} confirmed). This finds remakes whose synopses resemble the original, so it can miss some.</p>
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
  if (selectedFamily === undefined) selectedFamily = window.innerWidth < 700 ? null : "supernatural";
  drawCharts();
  // The small multiples' tooltips show posters: fetch them once a pointer reaches the figure,
  // so the first tooltips don't open on an empty frame.
  view.querySelector(".tl-hero")?.addEventListener("pointerenter", () => {
    data.bands.forEach((band) => band.posters?.forEach((p) => { new Image().src = `${POSTER}${p.poster}`; }));
  }, { once: true });
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
      selectedFamily = selectedFamily === id ? null : id;
      drawChart(families);
      drawChart(subjects);
      // On phones the subjects sit below all six families: bring them into view.
      if (selectedFamily && window.innerWidth < 700) subjects.scrollIntoView({ behavior: smooth(), block: "start" });
      return;
    }
    if (event.target.closest("[data-tl-franchises]")) {
      showAllFranchises = !showAllFranchises;
      drawChart(view.querySelector('[data-tl-chart="stories"]'));
    }
  });
  const pointTip = (event) => {
    const target = event.target.closest?.("[data-tip]");
    if (!target || !view.contains(target)) { tip.hidden = true; return; }
    showTip(tip, target.dataset.tip, event.clientX, event.clientY);
  };
  view.addEventListener("pointermove", pointTip);
  // Touch has no hover: a tap shows the tooltip (the decade's film on the small multiples).
  view.addEventListener("pointerdown", (event) => { if (event.pointerType !== "mouse") pointTip(event); });
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
// a hover column per year, whose tooltip can show that decade's most-rated film.
// `bare` draws a sparkline: no axis labels and almost no margins.
function smallMultiple(years, shares, thin, name, { width, height, top, ticks, yLabels, peak = null, when = (year) => year, film = null, bare = false }) {
  const left = yLabels ? 30 : 0;
  const [right, above, below] = bare ? [2, 3, 2] : [4, 16, 20];
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
  const xTicks = bare ? "" : [1940, 1980, 2020].map((tick) => `<text class="tl-axis" x="${x(tick)}" y="${height - 4}" text-anchor="middle">${tick}</text>`).join("");
  let note = "";
  if (peak) {
    const [year, value] = peak;
    const px = x(year);
    const anchor = px > width * 0.72 ? "end" : px < left + width * 0.2 ? "start" : "middle";
    note = `<circle class="tl-sm-peak" cx="${px.toFixed(1)}" cy="${y(value).toFixed(1)}" r="2.5"/><text class="tl-sm-note" x="${px.toFixed(1)}" y="${(y(value) - 7).toFixed(1)}" text-anchor="${anchor}">${pct(value)} in ${when(year)}</text>`;
  }
  const hover = hoverColumns(years, x, above, height - below, (index) => {
    if (shares[index] === null) return "";
    const decade = Math.floor(years[index] / 10) * 10;
    const f = film?.(decade);
    const poster = f ? `<span class="tl-tip-film"><img src="${POSTER}${esc(f.poster)}" alt="" width="46" height="69"><span class="tl-tip-film-text">Most-rated of the ${decade}s<em>${esc(f.title)}</em> (${f.year})</span></span>` : "";
    return `<strong>${name}, ${when(years[index])}</strong><span>${pct(shares[index])} of horror films${thin[index] ? " (fewer than 10 films: uncertain)" : ""}</span>${poster}`;
  });
  return `<svg class="tl-sm-chart" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${name}: share of horror films by year">${defs}${grid}${xTicks}${marks}${note}${hover}</svg>`;
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
        film: (decade) => decadeFilm(d, family.bands, decade),
      });
      return `<button type="button" class="tl-sm${on ? " on" : ""}" data-tl-family="${esc(family.id)}" aria-pressed="${on}"><span class="tl-sm-head"><span class="tl-sm-name">${esc(family.name)}</span><span class="tl-sm-share">${pct(latestShare(family.shares))}</span></span>${chart}</button>`;
    }).join("");
    return `<div class="tl-sm-grid" style="--cols:${cols};--gap:${gap}px">${cells}</div>`;
  },
  subjects(d, width) {
    const family = d.family_shares.find((f) => f.id === selectedFamily);
    if (!family) return "";
    if (family.bands.length === 1) {
      return `<div class="tl-subjects"><div class="tl-subjects-head"><h4>${esc(family.name)}</h4><p>One theme${family.id === "nature" ? ": killer plants, storms and other natural forces are counted with the animal attacks" : ""}.</p></div></div>`;
    }
    // One line per theme, in two columns: name, a sparkline on a scale shared by the
    // family's themes, and the latest share.
    const cols = width < 520 ? 1 : 2;
    const gap = cols > 1 ? 32 : 0;
    const cellWidth = Math.floor((width - gap * (cols - 1)) / cols);
    const nameWidth = Math.min(180, Math.round(cellWidth * 0.58));
    const sparkWidth = cellWidth - nameWidth - 44;
    const bands = family.bands.map((index) => [index, d.bands[index]]);
    const top = niceTop(Math.max(...bands.flatMap(([, band]) => band.shares.filter((v) => v !== null))), 0.05);
    const cells = bands.map(([index, band]) => {
      const chart = smallMultiple(d.band_years, band.shares, band.thin, band.name, { width: sparkWidth, height: 30, top, ticks: [0], yLabels: false, bare: true, film: (decade) => decadeFilm(d, [index], decade) });
      return `<div class="tl-spark${band.id.endsWith("_other") ? " other" : ""}" style="--name:${nameWidth}px"><span class="tl-spark-name" title="${esc(band.name)}">${esc(band.name)}</span>${chart}<span class="tl-spark-share">${pct(latestShare(band.shares))}</span></div>`;
    }).join("");
    return `<div class="tl-subjects"><div class="tl-subjects-head"><h4>${esc(family.name)}, by theme</h4><p>Share of all horror films, ${d.band_years[0]}–${d.band_years.at(-1)}, on one scale (0–${Math.round(top * 100)}%)</p></div><div class="tl-sparks" style="--cols:${cols};--gap:${gap}px">${cells}</div></div>`;
  },

  volume(d, width) {
    // Horror's share of films with 20+ TMDB ratings, with the world events the essay names.
    const v = d.volume;
    const keep = v.years.map((_, i) => i).filter((i) => v.years[i] >= 1930 && v.share_notable[i] !== null);
    const years = keep.map((i) => v.years[i]);
    const notable = keep.map((i) => v.share_notable[i]);
    const narrow = width < 560;
    const height = narrow ? 158 : 178;
    const m = { top: 42, right: 12, bottom: 24, left: 8 };
    // The top gridline stays below the event labels: the plot runs half a step above it.
    const max = Math.ceil(Math.max(...notable) * 20) / 20;
    const x = scale(years[0], years.at(-1), m.left, width - m.right);
    const y = scale(0, max, height - m.bottom, m.top);
    const ticks = Array.from({ length: Math.floor(max * 10 + 1e-9) + 1 }, (_, i) => i / 10);
    const events = EVENTS.map((event) => {
      const [x0, x1] = [x(Math.max(event.from, years[0])), x(Math.min(event.to, years.at(-1)))];
      const mark = x1 > x0
        ? `<rect class="tl-era-band" x="${x0.toFixed(1)}" y="${m.top - 6}" width="${(x1 - x0).toFixed(1)}" height="${height - m.bottom - m.top + 6}"/>`
        : `<line class="tl-event" x1="${x0.toFixed(1)}" x2="${x0.toFixed(1)}" y1="${m.top - 6}" y2="${height - m.bottom}"/>`;
      const at = { start: x0, end: x1, middle: (x0 + x1) / 2 }[event.anchor];
      return `${mark}<text class="tl-era-label" x="${at.toFixed(1)}" y="14" text-anchor="${event.anchor}">${narrow ? event.short : event.label}</text>`;
    }).join("");
    const base = y(0).toFixed(1);
    const area = `M${x(years[0]).toFixed(1)},${base}L${years.map((year, i) => `${x(year).toFixed(1)},${y(notable[i]).toFixed(1)}`).join("L")}L${x(years.at(-1)).toFixed(1)},${base}Z`;
    const peak = notable.indexOf(Math.max(...notable));
    const labels = [[peak, "middle"], [notable.length - 1, "end"]].map(([i, anchor]) => `<circle class="tl-dot" cx="${x(years[i])}" cy="${y(notable[i])}" r="3.5" style="fill:${ACCENT}"/><text class="tl-annot" x="${x(years[i])}" y="${y(notable[i]) - 9}" text-anchor="${anchor}">${pct(notable[i])} in ${years[i]}</text>`).join("");
    const eventAt = (year) => EVENTS.find((event) => event.from <= year && year <= event.to);
    const hits = hoverColumns(years, x, m.top, height - m.bottom, (i) => `<strong>${years[i]}${eventAt(years[i]) ? ` · ${eventAt(years[i]).title}` : ""}</strong><span>${pct(notable[i])} of films with 20+ ratings were horror</span><span>${num(v.horror_notable[keep[i]])} horror films with 20+ ratings that year</span>`);
    return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Horror's share of films with at least 20 TMDB ratings, per year since 1930, with the start and end of Hollywood’s censorship and the video boom marked.">
      ${events}
      ${gridY(ticks, y, m.left, width - m.right, (value) => `${Math.round(value * 100)}%`)}
      <path class="tl-vol-area" d="${area}"/>
      <path class="tl-line" style="stroke:${ACCENT}" d="${linePath(notable, x, y, years)}"/>
      ${labels}${hits}
      ${axisX(yearTicks(years[0], years.at(-1), width), x, height - m.bottom)}
    </svg>`;
  },

  threats(d, width) {
    const { years, series } = d.threats;
    const narrow = width < 560;
    // Lines are named at their right end (on phones, by the legend); peaks carry just their
    // value. Eras get short names in lanes above the plot (an era whose label would overlap
    // the one before it takes the next lane); their full name and film are in the tooltip.
    const short = { supernatural: "Supernatural", human: "Human", science: "Science", nature: "Nature" };
    const right = narrow ? 12 : 92;
    const ex = scale(years[0], years.at(-1), 8, width - right);
    const lanes = [];
    const eras = ERAS.filter((era) => era.to >= years[0]).map((era) => {
      const start = ex(Math.max(era.from, years[0]));
      const end = Math.max(ex(Math.min(era.to, years.at(-1))), start + era.short.length * 6 + 8);
      let lane = lanes.findIndex((edge) => edge + 4 < start);
      if (lane < 0) lane = lanes.length;
      lanes[lane] = end;
      return { ...era, lane };
    });
    const strip = lanes.length * 16 + 4;
    const height = (narrow ? 260 : 320) + strip;
    const m = { top: 26 + strip, right, bottom: 28, left: 8 };
    const max = Math.ceil(Math.max(...series.flatMap((s) => s.values.filter((v) => v !== null))) * 10) / 10;
    const x = scale(years[0], years.at(-1), m.left, width - m.right);
    const y = scale(0, max, height - m.bottom, m.top);
    const ticks = Array.from({ length: Math.round(max * 10) + 1 }, (_, i) => i / 10);
    const lines = series.map((s) => `<path class="tl-line" style="stroke:${THREAT_COLORS[s.key]}" d="${linePath(s.values, x, y, years)}"/>`).join("");
    // Peak labels, centred on their dot unless near an edge; when two would overlap, the
    // earlier one moves left of its dot and the later one right of its own.
    const peaks = series.map((s) => {
      const text = `${pct(s.peak.share)} in ${s.peak.year}`;
      return { s, text, room: text.length * 7, px: x(s.peak.year), py: y(s.peak.share), dx: 0, dy: -10 };
    }).sort((a, b) => a.px - b.px);
    const place = (p, anchor, dx) => { p.anchor = anchor; p.dx = dx; };
    peaks.forEach((p) => place(p, p.px + p.room / 2 > width - m.right ? "end" : p.px - p.room / 2 < 36 ? "start" : "middle", 0));
    const extent = (q) => (q.anchor === "middle" ? [q.px - q.room / 2, q.px + q.room / 2] : q.anchor === "end" ? [q.px - q.room, q.px] : [q.px, q.px + q.room]);
    peaks.forEach((p, i) => peaks.slice(i + 1).forEach((next) => {
      if (Math.abs(next.py + next.dy - p.py - p.dy) >= 16 || extent(p)[1] + 8 <= extent(next)[0]) return;
      // Moving left must keep clear of the y-axis labels; otherwise the later label goes below.
      if (p.px - p.room - 8 >= 36) { place(p, "end", -8); place(next, "start", 8); return; }
      next.dy = 22;
    }));
    const labels = peaks.map(({ s, text, px, py, anchor, dx, dy }) => `<circle class="tl-dot" cx="${px}" cy="${py}" r="4" style="fill:${THREAT_COLORS[s.key]}"/><text class="tl-annot" x="${px + dx}" y="${py + dy}" text-anchor="${anchor}">${text}</text>`).join("");
    // End labels, nudged apart so they keep 14px between them.
    const ends = narrow ? [] : series.map((s) => {
      const last = s.values.findLastIndex((v) => v !== null);
      return { s, y: y(s.values[last]) + 4 };
    }).sort((a, b) => a.y - b.y);
    ends.forEach((e, i) => { if (i && e.y - ends[i - 1].y < 14) e.y = ends[i - 1].y + 14; });
    const names = ends.map((e) => `<text class="tl-end-label" x="${width - m.right + 8}" y="${e.y.toFixed(1)}" style="fill:${THREAT_COLORS[e.s.key]}">${short[e.s.key]}</text>`).join("");
    const eraAt = (year) => ERAS.filter((era) => era.from <= year && year <= era.to);
    const hits = hoverColumns(years, x, m.top, height - m.bottom, (index) => `<strong>${years[index]}${eraAt(years[index]).map((era) => ` · ${era.label}`).join("")}</strong>` + series.map((s) => `<span><i class="tl-key" style="background:${THREAT_COLORS[s.key]}"></i>${s.label}: ${pct(s.values[index])}</span>`).join("") + eraAt(years[index]).map((era) => `<span>${era.label}: e.g. ${era.film}</span>`).join(""));
    return `${narrow ? `<div class="tl-legend">${series.map((s) => `<span><i class="tl-key tl-key-line" style="background:${THREAT_COLORS[s.key]}"></i>${s.label}</span>`).join("")}</div>` : ""}
    <svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Line chart of the share of horror films by source of threat, ${years[0]} to ${years.at(-1)}.">
      ${eras.map((era) => `<rect class="tl-era-band" x="${x(Math.max(era.from, years[0]))}" y="${m.top - 6}" width="${x(Math.min(era.to, years.at(-1))) - x(Math.max(era.from, years[0]))}" height="${height - m.bottom - m.top + 6}"/><line class="tl-era" x1="${x(Math.max(era.from, years[0]))}" x2="${x(Math.min(era.to, years.at(-1)))}" y1="${era.lane * 16 + 14}" y2="${era.lane * 16 + 14}"/><text class="tl-era-label" x="${x(Math.max(era.from, years[0]))}" y="${era.lane * 16 + 10}">${era.short}</text>`).join("")}
      ${gridY(ticks, y, m.left, width - m.right, (v) => `${Math.round(v * 100)}%`)}
      ${lines}${labels}${names}${hits}
      ${axisX(yearTicks(years[0], years.at(-1), width), x, height - m.bottom)}
    </svg>`;
  },
  geography(d, width) {
    // Countries by decade, each cell shaded by the country's share of that decade's horror
    // films and labelled with it. One square-root scale for all cells, so the US doesn't
    // wash out everyone else; decades with fewer than 300 films listed are faded.
    const { decades, countries, totals } = d.geography;
    const thin = totals.map((total) => total < 300);
    const narrow = width < 560;
    const peakOf = (shares) => Math.max(...shares.filter((_, i) => !thin[i]));
    const ordered = [...countries].sort((a, b) => peakOf(b.shares) - peakOf(a.shares));
    const max = Math.max(...countries.flatMap((c) => c.shares));
    const head = `<span></span>${decades.map((decade, i) => `<span class="tl-heat-year${thin[i] ? " thin" : ""}">${narrow ? `’${String(decade).slice(2)}` : `${decade}s`}</span>`).join("")}`;
    const rows = ordered.map((country) => `<span class="tl-heat-name">${esc(country.name)}</span>${country.shares.map((v, i) => {
      const level = Math.sqrt(v / max);
      const tip = `<strong>${esc(country.name)}, ${decades[i]}s</strong><span>${pct(v)} of the decade’s horror films</span><span>${num(totals[i])} horror films listed that decade${thin[i] ? " (few: uncertain)" : ""}</span>`;
      return `<span class="tl-heat-cell${level > 0.55 ? " dark" : ""}${thin[i] ? " thin" : ""}" style="--level:${Math.round(level * 100)}%" data-tip="${attr(tip)}">${v >= 0.01 ? Math.round(v * 100) : ""}</span>`;
    }).join("")}`).join("");
    return `<div class="tl-heat" style="--n:${decades.length};--label:${narrow ? 78 : 104}px">${head}${rows}</div>`;
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
    // One row per country, ranked: its signature theme, a bar for how many times as often as
    // the world it makes that theme, and its best-known film in it (poster; the title on hover).
    const name = Object.fromEntries(d.bands.map((band) => [band.id, band.name]));
    const rows = d.signatures.filter((row) => row.ratio >= 1.8);
    const max = Math.max(...rows.map((row) => row.ratio));
    const ratio = (value) => (value >= 4.5 ? Math.round(value) : value.toFixed(1));
    const body = rows.map((row) => {
      const tip = `<strong>${esc(row.name)}: ${esc(name[row.theme])}</strong><span>${pct(row.share)} of its horror films · ${pct(row.world)} worldwide</span>${row.example ? `<span>e.g. ${esc(row.example.title)} (${row.example.year})</span>` : ""}`;
      const poster = row.example?.poster ? filmBlock(d, row.example.id, "tl-sig-poster", "", `<img src="${POSTER}${esc(row.example.poster)}" alt="${esc(row.example.title)} (${row.example.year})" loading="lazy" width="18" height="27">`) : `<span class="tl-sig-poster"></span>`;
      return `<div class="tl-sig" data-tip="${attr(tip)}">${poster}<span class="tl-sig-country">${esc(row.name)}</span><span class="tl-sig-theme">${esc(name[row.theme])}</span><span class="tl-sig-bar"><i style="width:${((row.ratio / max) * 100).toFixed(1)}%"></i></span><strong class="tl-sig-ratio">×${ratio(row.ratio)}</strong><span class="tl-sig-share">${pct(row.share)} vs ${pct(row.world)}</span></div>`;
    }).join("");
    return `<div class="tl-sigs"><div class="tl-sig tl-sig-head" aria-hidden="true"><span></span><span>Country</span><span>Signature theme</span><span>Times the world average</span><span></span><span>Share vs world</span></div>${body}</div>`;
  },
  canon(d, width) {
    // Diverging bars: how much more or less often each theme appears among famous films
    // than among all horror films from the same decades.
    const rc = d.reach;
    const name = Object.fromEntries(d.bands.map((band) => [band.id, band.name]));
    // Only themes whose share differs by 20% or more.
    const rows = Object.keys(rc.expected_mix).filter((id) => rc.expected_mix[id] >= 0.006).map((id) => ({ id, change: (rc.canon_mix[id] || 0) / rc.expected_mix[id] - 1 })).filter((row) => Math.abs(row.change) >= 0.2).sort((a, b) => b.change - a.change);
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
    // Named films get a numbered ring on the chart and a card below it.
    const marked = [...named].sort((a, b) => b[4] - a[4]);
    // Named films get a ring and their title beside it: left of the ring in the chart's
    // right half; a label that would cross another label or ring moves down a line.
    const placed = [];
    const rings = marked.map((p) => [x(Math.sqrt(p[4])), y(p[3])]);
    const labels = marked.map((p, k) => {
      const [px, py] = rings[k];
      const text = `${p[1]} (${p[2]})`;
      const room = text.length * 6.6;
      const anchor = px > width * 0.55 ? "end" : "start";
      const left = anchor === "end" ? px - 11 - room : px + 11;
      let ty = py + 4;
      const blocked = () => placed.some((q) => Math.abs(q.y - ty) < 14 && left < q.right && left + room > q.left)
        || rings.some(([rx, ry], j) => j !== k && Math.abs(ry - (ty - 4)) < 12 && left - 8 < rx && rx < left + room + 8);
      while (blocked()) ty += 14;
      placed.push({ y: ty, left, right: left + room });
      return `<circle class="tl-reach-ring" cx="${px}" cy="${py}" r="7"/><text class="tl-reach-n" x="${anchor === "end" ? px - 11 : px + 11}" y="${ty}" text-anchor="${anchor}"${dotLink(d, p[0])}>${esc(text)}</text>`;
    }).join("");
    const xTicks = [0, 10, 40, 100].filter((t) => t <= maxLinks).map((t) => `<text class="tl-axis" x="${x(Math.sqrt(t))}" y="${height - 12}" text-anchor="middle">${t}</text>`).join("");
    const yTicks = [2, 4, 6, 8].map((t) => `<line class="tl-grid" x1="${m.left}" x2="${width - m.right}" y1="${y(t)}" y2="${y(t)}"/><text class="tl-axis" x="${m.left - 6}" y="${y(t) + 4}" text-anchor="end">${t}</text>`).join("");
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="TMDB rating against the number of Wikipedia languages with an article, per film">${yTicks}${xTicks}<text class="tl-axis" x="${width - m.right}" y="${height}" text-anchor="end">Wikipedia languages with an article →</text>${dots}${labels}</svg>`;
  },
  stories(d, width) {
    // Two columns: classic stories with one later version from each decade they were remade,
    // and the most-rated franchises film by film. Posters sit in order, with a line of the
    // films' TMDB ratings below them: the first film is filled, comebacks are hollow.
    const cols = width < 540 ? 1 : 2;
    const gap = cols > 1 ? 28 : 0;
    const colWidth = Math.floor((width - gap) / cols);
    const lineages = d.revivals.lineages.map((row) => ({ name: filmLink(d, row), note: `${row.year} · filmed again in ${row.decades} decades`, films: [row, ...row.returns] }));
    const all = d.franchises.franchises;
    const shown = showAllFranchises ? all : all.slice(0, lineages.length);
    const franchises = shown.map((f) => ({ name: `<em>${esc(f.name)}</em>`, note: `${f.entries.length} films, ${f.entries[0].year}–${f.entries.at(-1).year}`, films: f.entries }));
    const ratings = [...lineages, ...franchises].flatMap((story) => story.films.map((f) => f.tmdb).filter(Boolean));
    const [lo, hi] = [Math.floor(Math.min(...ratings)), Math.ceil(Math.max(...ratings))];
    const lineH = 54;
    const card = (story) => {
      const n = story.films.length;
      const space = Math.min(6, Math.max(3, Math.floor(colWidth / n / 8)));
      const posterW = Math.min(44, Math.floor((colWidth - space * (n - 1)) / n));
      const cx = (i) => i * (posterW + space) + posterW / 2;
      const y = scale(lo, hi, lineH - 6, 8);
      const year = (f) => (posterW < 30 ? `’${String(f.year).slice(2)}` : f.year);
      const tip = (f, i) => `<strong>${esc(f.title)} (${f.year})</strong>${f.tmdb ? `<span>TMDB ${f.tmdb.toFixed(1)}${f.movielens ? ` · MovieLens ${f.movielens.toFixed(1)}` : ""}</span>` : ""}${i === 0 ? "<span>The first film</span>" : ""}${f.comeback ? "<span>Sequel after a 10+ year break</span>" : ""}`;
      const posters = story.films.map((f, i) => filmBlock(d, f.id, `tl-story-poster${i === 0 ? " first" : ""}`, `style="width:${posterW}px" data-tip="${attr(tip(f, i))}"`, `<img src="${POSTER}${esc(f.poster)}" alt="${esc(f.title)} (${f.year})" loading="lazy" width="${posterW}" height="${Math.round(posterW * 1.5)}"><span>${year(f)}</span>`)).join("");
      const rated = story.films.map((f, i) => [f, i]).filter(([f]) => f.tmdb);
      const path = rated.map(([f, i], k) => `${k ? "L" : "M"}${cx(i).toFixed(1)},${y(f.tmdb).toFixed(1)}`).join("");
      const dots = rated.map(([f, i]) => `<circle class="tl-story-dot${i === 0 ? " first" : ""}${f.comeback ? " comeback" : ""}" cx="${cx(i).toFixed(1)}" cy="${y(f.tmdb).toFixed(1)}" r="${i === 0 ? 4 : 3}"${dotLink(d, f.id)} data-tip="${attr(tip(f, i))}"/>`).join("");
      const grid = [lo, hi].map((v) => `<line class="tl-grid" x1="0" x2="${colWidth}" y1="${y(v)}" y2="${y(v)}"/>`).join("");
      return `<div class="tl-story"><p class="tl-story-name">${story.name} <span>${story.note}</span></p><div class="tl-story-posters" style="gap:${space}px">${posters}</div><svg width="${colWidth}" height="${lineH}" viewBox="0 0 ${colWidth} ${lineH}" role="img" aria-label="TMDB rating of each film">${grid}<path class="tl-story-line" d="${path}"/>${dots}</svg></div>`;
    };
    const more = all.length > lineages.length ? `<button type="button" class="tl-more" data-tl-franchises>${showAllFranchises ? "Show fewer" : `Show all ${all.length} franchises`}</button>` : "";
    return `<div class="tl-legend"><span><i class="tl-key" style="background:${ACCENT}"></i>The first film</span><span><i class="tl-key tl-key-open"></i>Sequel after a 10+ year break</span><span>Lines: TMDB rating, ${lo} to ${hi} out of 10</span></div>
    <div class="tl-stories${cols === 1 ? " one" : ""}" style="--cols:${cols};--gap:${gap}px">
      <div class="tl-story-col"><h4 class="tl-story-head">Remade</h4>${lineages.map(card).join("")}</div>
      <div class="tl-story-col"><h4 class="tl-story-head">Continued</h4>${franchises.map(card).join("")}${more}</div>
    </div>`;
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
      const tip = `<strong>${esc(row.name)}</strong><span>${row.sources.length ? `Listed by ${row.sources.length} source${row.sources.length === 1 ? "" : "s"} (${row.types.split("").map((t) => m.source_types[t]).join(", ")})` : "Not taken from a source; added while grouping"}</span>${row.band ? `<span>Counted in: ${esc(row.band)}</span>` : ""}`;
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
