import {
  QUALITIES, QUALITY_KEYS, ROOT_NAMES, INTERVAL_NAMES, TUNING, STRING_NAMES, MAJOR_SCALE, MINOR_SCALE,
  makeChord, chordKey, voicingsFor, guessKey, keyName, diatonicChords, romanFor, nextDegrees,
  FUNCTION_TEXT, FUNCTION_SHORT, pc, noteName, noteWithOctave, pretty, positionsOf,
} from "./theory.js";
import { Listener } from "./detect.js";
import { renderNeck, diagramSVG } from "./fretboard.js";
import { playNote, strum, arpeggiate } from "./synth.js";
import { LESSONS } from "./lessons.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem("guitar-ear:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("guitar-ear:" + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

// ---------------------------------------------------------------------------
// State

const state = {
  tab: "listen",
  listener: null,
  listening: false,
  display: { type: "chord", chord: makeChord(0, "maj"), source: "example" },
  history: [makeChord(0, "maj"), makeChord(7, "maj"), makeChord(9, "min"), makeChord(5, "maj")],
  historyIsExample: true,
  labelMode: store.get("labelMode", "interval"),
  extra: store.get("extra", "none"),
  lastSoundAt: 0,
  lastNoteMidi: null,
  prevNoteMidi: null,
  frame: null,
};

// ---------------------------------------------------------------------------
// Tabs

function setTab(tab) {
  state.tab = tab;
  document.querySelectorAll("nav.tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
  for (const t of ["listen", "practice", "learn"]) $("view-" + t).hidden = t !== tab;
  if (tab === "practice" && !practice.task) newTask();
  if (tab === "learn") renderLesson();
  if (location.hash.slice(1) !== tab) history.replaceState(null, "", "#" + tab);
}
document.querySelectorAll("nav.tabs button").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
window.addEventListener("hashchange", () => {
  const t = location.hash.slice(1);
  if (["listen", "practice", "learn"].includes(t) && t !== state.tab) setTab(t);
});

// ---------------------------------------------------------------------------
// Listening

async function toggleListening() {
  if (state.listening) {
    state.listener.stop();
    state.listening = false;
    updateListenUI();
    return;
  }
  try {
    state.listener = new Listener(onFrame);
    await state.listener.start();
    state.listening = true;
    $("banner").hidden = true;
    if (state.historyIsExample) { state.history = []; state.historyIsExample = false; renderHistory(); }
  } catch (err) {
    console.error("Microphone failed", err);
    const b = $("banner");
    b.hidden = false;
    b.classList.add("error");
    b.querySelector("p").innerHTML = err && err.name === "NotAllowedError"
      ? "<strong>Microphone access was blocked.</strong> Allow the mic for this page in your browser's address bar, then try again."
      : `<strong>Couldn't open the microphone</strong> (${esc(err?.message || err)}). Check that a mic is connected and not used by another app.`;
  }
  updateListenUI();
}
$("listenBtn").addEventListener("click", toggleListening);
$("bannerStart").addEventListener("click", toggleListening);

function updateListenUI() {
  $("listenBtn").classList.toggle("on", state.listening);
  $("listenLabel").textContent = state.listening ? "Listening" : "Start listening";
  if (!state.listening) $("meter").style.width = "0";
  updatePill();
}

function updatePill() {
  const pill = $("nowPill");
  const stale = state.listening && performance.now() - state.lastSoundAt > 1500;
  if (!state.listening) { pill.textContent = state.display.source === "pick" ? "exploring" : "not listening"; pill.className = "pill"; }
  else if (stale) { pill.textContent = "last heard"; pill.className = "pill"; }
  else { pill.textContent = "live"; pill.className = "pill live"; }
  $("readout").classList.toggle("stale", stale && state.display.source === "mic");
}

// ---------------------------------------------------------------------------
// Frame handling (≈25 per second)

const chromaBars = [];
(function buildChroma() {
  const box = $("chroma");
  for (let i = 0; i < 12; i++) {
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.innerHTML = `<div class="fill-wrap"><div class="fill"></div></div><span>${pretty(noteName(i))}</span>`;
    box.appendChild(bar);
    chromaBars.push(bar);
  }
})();

function onFrame(f) {
  state.frame = f;
  $("meter").style.width = (f.level * 100).toFixed(0) + "%";
  if (!f.silent) state.lastSoundAt = performance.now();

  // Chroma bars + count
  let max = 0;
  for (let i = 0; i < 12; i++) max = Math.max(max, f.chroma[i]);
  const active = new Set(f.silent ? [] : f.activePcs || []);
  for (let i = 0; i < 12; i++) {
    const v = max > 0.05 ? f.chroma[i] / max : 0;
    chromaBars[i].querySelector(".fill").style.height = (v * 100).toFixed(0) + "%";
    chromaBars[i].classList.toggle("on", active.has(i));
  }
  $("noteCount").textContent = f.silent ? "quiet" : active.size === 1 ? "1 note" : `${active.size} notes`;

  // Tuner
  if (f.pitch && !f.silent) {
    const m = f.pitch.midi;
    const nearest = Math.round(m);
    const c = (m - nearest) * 100;
    $("tunerNote").innerHTML = `${pretty(noteName(pc(nearest)))}<small>${Math.floor(nearest / 12) - 1}</small>`;
    $("hz").textContent = f.pitch.f.toFixed(1) + " Hz";
    $("needle").style.left = `calc(${50 + Math.max(-50, Math.min(50, c))}% - 2px)`;
    $("centsTxt").textContent = Math.abs(c) < 5 ? "in tune" : `${c > 0 ? "+" : "−"}${Math.abs(c).toFixed(0)}¢ ${c > 0 ? "sharp" : "flat"}`;
  }

  // What to show in the big readout
  if (f.stableMode === "chord" && f.stableChord) {
    const ch = f.stableChord;
    const cur = state.display;
    if (cur.type !== "chord" || cur.source !== "mic" || chordKey(cur.chord) !== chordKey(ch) || cur.chord.slash !== ch.slash) {
      setDisplay({ type: "chord", chord: ch, source: "mic", alternatives: f.alternatives || [] });
      pushHistory(ch);
    }
  } else if (f.stableMode === "note" && f.pitch && !f.silent) {
    const midi = Math.round(f.pitch.midi);
    if (state.display.type !== "note" || state.display.midi !== midi) {
      if (state.lastNoteMidi != null && state.lastNoteMidi !== midi) state.prevNoteMidi = state.lastNoteMidi;
      state.lastNoteMidi = midi;
      setDisplay({ type: "note", midi, source: "mic" });
    }
  }

  if (state.tab === "practice") practiceFrame(f);
  updatePill();
}

// ---------------------------------------------------------------------------
// Readout

function setDisplay(d) {
  state.display = d;
  renderReadout();
  renderNeckView();
  renderVoicings();
  renderKeyBox();
}

function currentKey() {
  const ranked = guessKey(state.history);
  return ranked.length ? ranked[0].key : null;
}

function renderReadout() {
  const d = state.display;
  const label = $("nowLabel");
  if (d.type === "chord") {
    const c = d.chord;
    label.textContent = d.source === "mic" ? "You're playing" : d.source === "pick" ? "Exploring" : "Example chord";
    $("nowSym").innerHTML = `${esc(pretty(c.rootName))}<span class="q">${esc(pretty(c.q.symbol))}</span>${c.slash ? `<span class="q">/${esc(pretty(c.slash))}</span>` : ""}`;
    $("nowFull").textContent = pretty(c.fullName);
    $("nowTones").innerHTML = c.tones.map((t) => `
      <div class="tone"><span class="badge bg-${t.role}">${esc(t.label)}</span><b>${esc(pretty(t.name))}</b><small>${esc(t.semi === 0 ? "root" : t.ivName)}</small></div>`).join("");
    $("nowFeel").innerHTML = `<b>Sound:</b> ${esc(c.q.feel)}`;
    const slashTxt = c.slash ? ` The lowest note is ${pretty(c.slash)} instead of ${pretty(c.rootName)}, written after the slash.` : "";
    $("nowWhy").textContent = `Why "${pretty(c.baseSymbol)}": ${c.q.why}${slashTxt}`;
    const k = currentKey();
    const alts = (d.alternatives || []).filter((a) => a.pcs.length === c.pcs.length && a.pcs.every((p) => c.pcs.includes(p)));
    let aka = "";
    if (alts.length) aka += `Same notes, other name: ${alts.map((a) => `<button type="button" data-show="${a.rootPc}:${a.quality}">${esc(pretty(a.symbol))}</button>`).join(" ")}. The bass note decides. `;
    if (k && d.source === "mic") {
      const r = romanFor(c, k);
      aka += r.diatonic
        ? `In ${keyName(k)} this is the <b>${r.numeral}</b> chord (${r.fn}: ${FUNCTION_TEXT[r.fn]}).`
        : `In ${keyName(k)} this is <b>${r.numeral}</b>, a chord from outside the key that adds color.`;
    }
    $("nowAka").innerHTML = aka;
    $("pickRoot").value = c.rootPc;
    $("pickQuality").value = c.quality;
  } else {
    const midi = d.midi;
    label.textContent = "Single note";
    $("nowSym").innerHTML = `${esc(pretty(noteName(pc(midi))))}<span class="q">${Math.floor(midi / 12) - 1}</span>`;
    const alt = ["C#", "Eb", "F#", "Ab", "Bb"].includes(noteName(pc(midi))) ? ` (also called ${pretty(enharmonic(noteName(pc(midi))))})` : "";
    $("nowFull").textContent = `${noteWithOctave(midi)}${alt}`;
    const where = positionsOf(pc(midi), 12)
      .filter((p) => TUNING[p.s] + p.f === midi)
      .map((p) => (p.f === 0 ? `open ${STRING_NAMES[p.s]}` : `${STRING_NAMES[p.s]} string fret ${p.f}`));
    $("nowTones").innerHTML = `<div class="tone"><span class="badge" style="background:var(--ink)">♪</span><b>${pretty(noteName(pc(midi)))}</b><small>${where.length} place${where.length === 1 ? "" : "s"} on the neck</small></div>`;
    $("nowFeel").innerHTML = where.length ? `<b>This exact pitch is at:</b> ${where.map(esc).join(" · ")}.` : "";
    let why = "The same note name also repeats every 12 frets and across strings; the outlined dots on the neck show this exact pitch.";
    if (state.prevNoteMidi != null) {
      const diff = midi - state.prevNoteMidi;
      const iv = INTERVAL_NAMES[Math.abs(diff) % 12];
      const oct = Math.floor(Math.abs(diff) / 12);
      $("intervalTxt").innerHTML = `From ${pretty(noteWithOctave(state.prevNoteMidi))} to ${pretty(noteWithOctave(midi))}: <b>${Math.abs(diff)} frets ${diff > 0 ? "up" : "down"}</b>, a ${iv.name}${oct ? ` plus ${oct} octave${oct > 1 ? "s" : ""}` : ""} (${iv.feel}).`;
    }
    const k = currentKey();
    if (k) {
      const scale = k.mode === "major" ? MAJOR_SCALE : MINOR_SCALE;
      const deg = scale.indexOf((pc(midi) - k.tonic + 12) % 12);
      why += deg >= 0 ? ` In ${keyName(k)} it's scale degree ${deg + 1}.` : ` It's not in ${keyName(k)}, so it adds tension or color.`;
    }
    $("nowWhy").textContent = why;
    $("nowAka").innerHTML = "";
  }
}

function enharmonic(n) {
  return { "C#": "D♭", Eb: "D♯", "F#": "G♭", Ab: "G♯", Bb: "A♯" }[n] || n;
}

// Explore pickers
(function initPickers() {
  $("pickRoot").innerHTML = ROOT_NAMES.map((n, i) => `<option value="${i}">${pretty(n)}</option>`).join("");
  $("pickQuality").innerHTML = QUALITY_KEYS.map((q) => `<option value="${q}">${QUALITIES[q].name}</option>`).join("");
  const pick = () => {
    const ch = makeChord(+$("pickRoot").value, $("pickQuality").value);
    setDisplay({ type: "chord", chord: ch, source: "pick" });
    strumChord(ch);
  };
  $("pickRoot").addEventListener("change", pick);
  $("pickQuality").addEventListener("change", pick);
  $("playNow").addEventListener("click", () => {
    const d = state.display;
    if (d.type === "chord") strumChord(d.chord);
    else playNote(d.midi);
  });
})();

function strumChord(ch) {
  const v = voicingsFor(ch)[0];
  if (v) strum(v.notes);
  else strum(ch.tones.map((t) => 48 + ((t.pc - 0 + 12) % 12) + (t.pc < ch.rootPc ? 12 : 0)));
}

document.addEventListener("click", (e) => {
  const show = e.target.closest("[data-show]");
  if (show) {
    const [r, q] = show.dataset.show.split(":");
    const ch = makeChord(+r, q);
    setDisplay({ type: "chord", chord: ch, source: "pick" });
    strumChord(ch);
  }
});

// ---------------------------------------------------------------------------
// Neck

function renderNeckView() {
  const d = state.display;
  const marks = new Map();
  const exact = new Set();
  let title, sub;
  if (d.type === "chord") {
    for (const t of d.chord.tones) marks.set(t.pc, { label: state.labelMode === "interval" ? t.label : t.name, role: t.role });
    title = `Where ${pretty(d.chord.symbol)} lives on the neck`;
    sub = "Every place on the first 15 frets where the chord's notes appear. Any combination of one dot per string that you can reach makes a valid voicing.";
  } else {
    marks.set(pc(d.midi), { label: noteName(pc(d.midi)), role: "note" });
    exact.add(d.midi);
    title = `Every ${pretty(noteName(pc(d.midi)))} on the neck`;
    sub = "Outlined dots are the exact pitch you played; the others are the same note in other octaves.";
  }
  const faint = new Map();
  if (state.extra === "key") {
    const k = currentKey() || (d.type === "chord" ? { tonic: d.chord.rootPc, mode: d.chord.q.family === "min" ? "minor" : "major" } : { tonic: pc(d.midi), mode: "major" });
    const scale = k.mode === "major" ? MAJOR_SCALE : MINOR_SCALE;
    scale.forEach((s, i) => faint.set((k.tonic + s) % 12, state.labelMode === "interval" ? String(i + 1) : noteName((k.tonic + s) % 12)));
    sub = `Filled dots: ${d.type === "chord" ? "chord tones" : "your note"}. Hollow dots: the rest of the ${keyName(k)} scale${currentKey() ? "" : " (a guess until you play a few chords)"}${state.labelMode === "interval" ? ", numbered as scale degrees" : ""}.`;
  }
  $("neckTitle").textContent = pretty(title);
  $("neckSub").textContent = sub;
  renderNeck($("neck"), { marks, faint, exact, showAll: state.extra === "all", onPick: (midi) => playNote(midi) });
}

function bindSeg(attr, key, after) {
  document.querySelectorAll(`[data-${attr}]`).forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset[attr] === state[key]));
    b.addEventListener("click", () => {
      state[key] = b.dataset[attr];
      store.set(key, state[key]);
      document.querySelectorAll(`[data-${attr}]`).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      after();
    });
  });
}
bindSeg("label", "labelMode", renderNeckView);
bindSeg("extra", "extra", renderNeckView);

// ---------------------------------------------------------------------------
// Voicings

function renderVoicings() {
  const d = state.display;
  const box = $("voicings");
  if (d.type !== "chord") {
    $("voicingTitle").textContent = pretty(noteName(pc(d.midi))) + " chords";
    const maj = makeChord(pc(d.midi), "maj"), min = makeChord(pc(d.midi), "min");
    box.innerHTML = `<p class="muted" style="grid-column:1/-1">You're playing a single note. Chords built on it: ${[maj, min, makeChord(pc(d.midi), "7")].map((c) => `<button class="chip" type="button" data-show="${c.rootPc}:${c.quality}">${pretty(c.symbol)}</button>`).join(" ")}</p>`;
    return;
  }
  $("voicingTitle").textContent = pretty(d.chord.baseSymbol);
  const vs = voicingsFor(d.chord);
  box.innerHTML = vs.length
    ? vs.map((v, i) => `<button class="voicing" type="button" data-v="${i}">${diagramSVG(d.chord, v)}<span class="vl">${esc(v.label)}</span><span class="vd">${esc(v.detail)}</span></button>`).join("")
    : `<p class="muted">No common shape stored for this chord yet.</p>`;
  box.querySelectorAll(".voicing").forEach((b) => b.addEventListener("click", () => strum(vs[+b.dataset.v].notes)));
}

// ---------------------------------------------------------------------------
// History & key

function pushHistory(ch) {
  const last = state.history[state.history.length - 1];
  if (last && chordKey(last) === chordKey(ch)) return;
  state.history.push(ch);
  if (state.history.length > 16) state.history.shift();
  renderHistory();
}

function renderHistory() {
  const k = currentKey();
  const box = $("history");
  if (!state.history.length) {
    box.innerHTML = `<p class="muted">Chords you play show up here, in order.</p>`;
  } else {
    box.innerHTML = state.history.map((c, i) => {
      const r = k ? romanFor(c, k) : null;
      const last = i === state.history.length - 1;
      return `<button type="button" class="hchip${r && !r.diatonic ? " out" : ""}${last ? " last" : ""}" data-show="${c.rootPc}:${c.quality}" title="${esc(c.fullName)}"><b>${esc(pretty(c.baseSymbol))}</b><small>${r ? esc(r.numeral) : "&nbsp;"}</small></button>`;
    }).join("");
    if (state.historyIsExample) box.insertAdjacentHTML("beforeend", `<span class="pill" style="align-self:center">example</span>`);
  }
  renderKeyBox();
}

$("clearHistory").addEventListener("click", () => { state.history = []; state.historyIsExample = false; renderHistory(); });

function renderKeyBox() {
  const box = $("keyBox");
  const ranked = guessKey(state.history);
  if (!ranked.length) {
    box.innerHTML = `<p class="hint">Play at least two different chords and I'll work out which key you're in.</p>`;
    return;
  }
  const k = ranked[0].key;
  const second = ranked[1];
  const relative = second && second.key.mode !== k.mode && ((k.mode === "major" && second.key.tonic === (k.tonic + 9) % 12) || (k.mode === "minor" && second.key.tonic === (k.tonic + 3) % 12));
  const close = second && ranked[0].score - second.score < 0.35;
  const dia = diatonicChords(k);
  const d = state.display;
  const curR = d.type === "chord" ? romanFor(d.chord, k) : null;
  const curDeg = curR && curR.diatonic ? curR.deg : -1;
  const next = curDeg >= 0 ? nextDegrees(k, curDeg) : [];
  let hint;
  if (curDeg >= 0) {
    const fn = dia[curDeg].fn;
    hint = `<b>${pretty(d.chord.baseSymbol)}</b> is the <b>${dia[curDeg].numeral}</b> chord: ${fn} (${FUNCTION_TEXT[fn]}). It often moves to ${next.map((n) => `<b>${pretty(dia[n].chord.symbol)}</b> (${dia[n].numeral})`).join(", ")}. Those are outlined in green.`;
  } else if (curR) {
    hint = `<b>${pretty(d.chord.baseSymbol)}</b> is outside ${keyName(k)} (${curR.numeral}). Borrowed chords like this add color; ♭VII and iv are the most common ones in rock and pop.`;
  } else {
    hint = "These are the seven chords that naturally belong to this key. Tap one to hear it.";
  }
  box.innerHTML = `
    <div class="keyline"><span class="eyebrow">Sounds like</span><span class="k">${pretty(keyName(k))}</span>
      ${close && second ? `<span class="muted" style="font-size:.85rem">or ${pretty(keyName(second.key))}${relative ? " (same notes, different home)" : ""}</span>` : ""}</div>
    <div class="diatonic">${dia.map((x) => `
      <button type="button" class="dchip${x.deg === curDeg ? " current" : ""}${next.includes(x.deg) ? " next" : ""}" data-show="${x.chord.rootPc}:${x.chord.quality}">
        <small>${x.numeral}</small><b>${pretty(x.chord.symbol)}</b><span class="fn">${FUNCTION_SHORT[x.fn]}</span>
      </button>`).join("")}</div>
    <p class="hint">${hint}</p>`;
}

// ---------------------------------------------------------------------------
// Practice

const practice = {
  type: "chord", task: null, hold: 0, streak: 0, solved: store.get("solved", 0), best: store.get("best", 0),
  lastFeedbackAt: 0, done: false, wrongPc: null,
};
const CHORD_POOL = [
  "0:maj", "9:maj", "7:maj", "4:maj", "2:maj", "9:min", "4:min", "2:min", "5:maj", "11:min",
  "9:7", "4:7", "2:7", "7:7", "0:7", "11:7", "0:maj7", "9:maj7", "5:maj7", "9:m7", "4:m7", "2:m7",
  "9:sus2", "9:sus4", "2:sus2", "2:sus4", "4:sus4", "0:add9", "4:5", "9:5",
];
const PROGS = [
  { name: "I – IV – V – I", mode: "major", degs: [0, 3, 4, 0] },
  { name: "I – V – vi – IV", mode: "major", degs: [0, 4, 5, 3] },
  { name: "vi – IV – I – V", mode: "major", degs: [5, 3, 0, 4] },
  { name: "ii – V – I", mode: "major", degs: [1, 4, 0] },
  { name: "i – iv – V – i", mode: "minor", degs: [0, 3, 104, 0] },
  { name: "i – VI – VII – i", mode: "minor", degs: [0, 5, 6, 0] },
];
const PROG_KEYS = { major: [0, 7, 2, 9, 4], minor: [9, 4, 2] };
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

function progChord(k, d) {
  if (d >= 100) return makeChord((k.tonic + (k.mode === "major" ? MAJOR_SCALE : MINOR_SCALE)[d - 100]) % 12, "maj");
  return diatonicChords(k)[d].chord;
}

document.querySelectorAll("[data-ex]").forEach((b) => b.addEventListener("click", () => {
  practice.type = b.dataset.ex;
  document.querySelectorAll("[data-ex]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  newTask();
}));

function newTask() {
  practice.hold = 0;
  practice.done = false;
  const t = practice.type;
  let task;
  if (t === "chord") {
    let pick;
    do pick = rand(CHORD_POOL); while (practice.task && practice.task.key === pick && CHORD_POOL.length > 1);
    const [r, q] = pick.split(":");
    task = { type: t, key: pick, chord: makeChord(+r, q) };
  } else if (t === "note") {
    let p;
    do p = Math.floor(Math.random() * 12); while (practice.task && practice.task.pc === p);
    task = { type: t, pc: p };
  } else if (t === "interval") {
    const ch = makeChord(rand([0, 2, 4, 5, 7, 9, 11]), rand(["maj", "maj", "min", "7", "maj7", "m7"]));
    const tone = rand(ch.tones);
    task = { type: t, chord: ch, tone, pc: tone.pc };
  } else {
    const prog = rand(PROGS);
    const k = { tonic: rand(PROG_KEYS[prog.mode]), mode: prog.mode };
    task = { type: t, prog, k, chords: prog.degs.map((d) => progChord(k, d)), step: 0 };
  }
  practice.task = task;
  renderTask();
  setFeedback(state.listening ? "Go ahead, I'm listening." : "Press Start listening at the top, then play.", "");
}

function renderTask() {
  const t = practice.task;
  const box = $("task");
  if (t.type === "chord") {
    const v = voicingsFor(t.chord)[0];
    box.innerHTML = `
      <span class="eyebrow">Play this chord</span>
      <div class="prompt"><span class="target-sym">${esc(pretty(t.chord.symbol))}</span></div>
      <p class="muted">${esc(pretty(t.chord.fullName))}: ${t.chord.tones.map((x) => `${pretty(x.name)} (${x.label})`).join(", ")}</p>
      <details><summary class="linkish" style="cursor:pointer">Show me a shape</summary><div style="max-width:170px;margin-top:8px">${v ? diagramSVG(t.chord, v) : ""}</div></details>
      <div class="row"><button class="btn" type="button" id="tHear">▶ Hear it</button><button class="btn" type="button" id="tSkip">Skip</button></div>`;
    $("tHear").onclick = () => strumChord(t.chord);
  } else if (t.type === "note") {
    const pos = positionsOf(t.pc, 12).filter((p) => p.s <= 1).map((p) => (p.f === 0 ? `open ${STRING_NAMES[p.s]}` : `${STRING_NAMES[p.s]} string, fret ${p.f}`));
    box.innerHTML = `
      <span class="eyebrow">Find this note, any string, any octave</span>
      <div class="prompt"><span class="target-sym">${esc(pretty(noteName(t.pc)))}</span></div>
      <p class="muted">Play one string at a time. Count frets from a note you know, remembering there's no sharp between B–C and E–F.</p>
      <details><summary class="linkish" style="cursor:pointer">Hint: where is it on the low strings?</summary><p style="margin-top:6px">${esc(pos.join(" · "))}</p></details>
      <div class="row"><button class="btn" type="button" id="tHear">▶ Hear it</button><button class="btn" type="button" id="tSkip">Skip</button></div>`;
    $("tHear").onclick = () => playNote(48 + t.pc);
  } else if (t.type === "interval") {
    const roleWord = t.tone.ivName;
    box.innerHTML = `
      <span class="eyebrow">Chord tones</span>
      <div class="prompt">Play the <span class="target-sym">${t.tone.semi === 0 ? "root" : esc(t.tone.label)}</span> of ${esc(pretty(t.chord.symbol))}</div>
      <p class="muted">${t.tone.semi === 0 ? "The root is the note the chord is named after." : `The ${esc(t.tone.label)} is the ${esc(roleWord)}: ${t.tone.semi} frets above the root ${esc(pretty(t.chord.rootName))}.`} Play a single note.</p>
      <details><summary class="linkish" style="cursor:pointer">Show the answer</summary><p style="margin-top:6px"><b>${esc(pretty(t.tone.name))}</b>. ${esc(pretty(t.chord.symbol))} = ${t.chord.tones.map((x) => `${pretty(x.name)} (${x.label})`).join(", ")}</p></details>
      <div class="row"><button class="btn" type="button" id="tHear">▶ Hear the chord</button><button class="btn" type="button" id="tSkip">Skip</button></div>`;
    $("tHear").onclick = () => strumChord(t.chord);
  } else {
    const cur = t.chords[Math.min(t.step, t.chords.length - 1)];
    const v = voicingsFor(cur)[0];
    box.innerHTML = `
      <span class="eyebrow">Progression in ${esc(pretty(keyName(t.k)))}: ${esc(t.prog.name)}</span>
      <div class="progress-steps">${t.chords.map((c, i) => `<span class="${i < t.step ? "done" : i === t.step ? "cur" : ""}">${esc(pretty(c.symbol))}</span>`).join("")}</div>
      <div class="prompt">${t.step < t.chords.length ? `Now: <span class="target-sym">${esc(pretty(cur.symbol))}</span>` : "Done!"}</div>
      <p class="muted">${t.step < t.chords.length ? `${esc(pretty(cur.fullName))}, the <b>${esc(romanFor(cur, t.k).numeral)}</b> chord in this key.` : ""}</p>
      ${v && t.step < t.chords.length ? `<div style="max-width:150px">${diagramSVG(cur, v)}</div>` : ""}
      <div class="row"><button class="btn" type="button" id="tHear">▶ Hear the progression</button><button class="btn" type="button" id="tSkip">${t.step >= t.chords.length ? "Next" : "Skip"}</button></div>`;
    $("tHear").onclick = () => playProg(t.k, t.prog.degs);
  }
  $("tSkip").onclick = () => { if (!practice.done) practice.streak = 0; renderScore(); newTask(); };
  renderScore();
}

function renderScore() {
  $("streak").textContent = practice.streak;
  $("solved").textContent = practice.solved;
  $("best").textContent = practice.best;
}

function setFeedback(html, cls) {
  const f = $("feedback");
  f.innerHTML = html;
  f.className = "feedback" + (cls ? " " + cls : "");
}

function chordMatches(heard, target) {
  if (!heard) return false;
  if (heard.rootPc === target.rootPc && heard.quality === target.quality) return true;
  return heard.pcs.length === target.pcs.length && heard.pcs.every((p) => target.pcs.includes(p));
}

function practiceFrame(f) {
  const t = practice.task;
  if (!t || practice.done) return;
  const heardChord = f.silent ? null : f.chord;
  const heardNote = !f.silent && f.pitch && (f.activePcs || []).length <= 2 ? Math.round(f.pitch.midi) : null;
  $("pHeard").textContent = f.silent ? "–" : heardChord && t.type !== "note" && t.type !== "interval" ? pretty(heardChord.symbol) : heardNote != null ? pretty(noteWithOctave(heardNote)) : heardChord ? pretty(heardChord.symbol) : "…";

  let match = false;
  let target = null;
  if (t.type === "chord" || t.type === "prog") {
    target = t.type === "chord" ? t.chord : t.chords[t.step];
    match = chordMatches(heardChord, target);
  } else {
    match = heardNote != null && pc(heardNote) === t.pc;
  }
  const need = t.type === "chord" || t.type === "prog" ? 600 : 400;
  practice.hold = match ? practice.hold + 40 : Math.max(0, practice.hold - 80);
  $("holdBar").style.width = Math.min(100, (practice.hold / need) * 100) + "%";

  if (practice.hold >= need) { success(f, heardNote); return; }

  // Near-miss coaching, at most ~3 times per second.
  const now = performance.now();
  if (now - practice.lastFeedbackAt < 350 || f.silent) return;
  practice.lastFeedbackAt = now;
  if ((t.type === "chord" || t.type === "prog") && heardChord && !match) {
    const missing = target.tones.filter((x) => !(f.activePcs || []).includes(x.pc));
    const extra = (f.activePcs || []).filter((p) => !target.pcs.includes(p));
    let msg = `I hear <b>${esc(pretty(heardChord.symbol))}</b>. `;
    if (heardChord.rootPc === target.rootPc && heardChord.q.family !== target.q.family) {
      const ht = heardChord.tones.find((x) => x.deg === 3), tt = target.tones.find((x) => x.deg === 3);
      if (ht && tt) msg += `Right root, but the third is ${pretty(ht.name)} and it should be ${pretty(tt.name)}. `;
    }
    if (missing.length) msg += `Missing: ${missing.map((x) => `${pretty(x.name)} (${x.label})`).join(", ")}. `;
    if (extra.length) msg += `Extra: ${extra.map((p) => pretty(noteName(p))).join(", ")}.`;
    setFeedback(msg, "near");
  } else if ((t.type === "note" || t.type === "interval") && heardNote != null && !match) {
    let msg = `That's <b>${esc(pretty(noteWithOctave(heardNote)))}</b>. `;
    const diff = (t.pc - pc(heardNote) + 12) % 12;
    msg += diff <= 6 ? `Go ${diff} fret${diff === 1 ? "" : "s"} up.` : `Go ${12 - diff} fret${12 - diff === 1 ? "" : "s"} down.`;
    if (t.type === "interval") {
      const isTone = t.chord.tones.find((x) => x.pc === pc(heardNote));
      if (isTone) msg += ` (${pretty(isTone.name)} is the ${isTone.semi === 0 ? "root" : isTone.label} of ${pretty(t.chord.symbol)}.)`;
    }
    setFeedback(msg, "near");
  }
}

function success(f, heardNote) {
  const t = practice.task;
  practice.hold = 0;
  $("holdBar").style.width = "0";
  if (t.type === "prog") {
    t.step++;
    if (t.step < t.chords.length) {
      setFeedback(`✓ ${esc(pretty(t.chords[t.step - 1].symbol))}. Next up: <b>${esc(pretty(t.chords[t.step].symbol))}</b>.`, "ok");
      renderTask();
      return;
    }
  }
  practice.done = true;
  practice.streak++;
  practice.solved++;
  practice.best = Math.max(practice.best, practice.streak);
  store.set("solved", practice.solved);
  store.set("best", practice.best);
  let msg = "✓ Nailed it. ";
  if (t.type === "chord") msg += `${pretty(t.chord.symbol)} = ${t.chord.tones.map((x) => pretty(x.name)).join(" ")}. ${esc(t.chord.q.feel)}`;
  else if (t.type === "note") {
    const where = positionsOf(t.pc, 12).filter((p) => p.s <= 2).slice(0, 4).map((p) => (p.f === 0 ? `open ${STRING_NAMES[p.s]} string` : `${STRING_NAMES[p.s]} string fret ${p.f}`));
    msg += `${pretty(noteName(t.pc))} also lives at: ${where.join(", ")}.`;
  } else if (t.type === "interval") msg += `${pretty(t.tone.name)} is the ${t.tone.semi === 0 ? "root" : t.tone.label} of ${pretty(t.chord.symbol)}, ${t.tone.semi} frets above ${pretty(t.chord.rootName)}.`;
  else msg += `That's ${t.prog.name} in ${pretty(keyName(t.k))}. The same numerals work in every key: try it again, starting from a different chord.`;
  setFeedback(msg + ` <button class="btn primary" type="button" id="nextTask" style="margin-left:6px">Next →</button>`, "ok");
  $("nextTask").onclick = newTask;
  renderScore();
  if (t.type === "prog") renderTask();
}

// ---------------------------------------------------------------------------
// Sound helpers shared by lessons

function playProg(k, degs) {
  const chords = degs.map((d) => progChord(k, d));
  chords.forEach((c, i) => setTimeout(() => strumChord(c), i * 900));
}

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-notes],[data-arp],[data-chord],[data-prog]");
  if (!b) return;
  if (b.dataset.notes) strum(b.dataset.notes.split(",").map(Number));
  else if (b.dataset.arp) arpeggiate(b.dataset.arp.split(",").map(Number));
  else if (b.dataset.chord) { const [r, q] = b.dataset.chord.split(":"); strumChord(makeChord(+r, q)); }
  else if (b.dataset.prog) {
    const [t, mode, list] = b.dataset.prog.split(":");
    playProg({ tonic: +t, mode }, list.split(",").map(Number));
  }
});

// ---------------------------------------------------------------------------
// Learn

let lessonId = store.get("lesson", "notes");
function renderLesson() {
  if (!LESSONS.find((l) => l.id === lessonId)) lessonId = LESSONS[0].id;
  $("toc").innerHTML = LESSONS.map((l, i) => `<button type="button" data-lesson="${l.id}" aria-current="${l.id === lessonId}">${i + 1}. ${esc(l.title)}</button>`).join("");
  $("toc").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
    lessonId = b.dataset.lesson;
    store.set("lesson", lessonId);
    renderLesson();
    $("lesson").scrollIntoView({ block: "start", behavior: "smooth" });
  }));
  const l = LESSONS.find((x) => x.id === lessonId);
  const idx = LESSONS.indexOf(l);
  const next = LESSONS[idx + 1];
  $("lesson").innerHTML = l.html() + (next ? `<div><button class="btn" type="button" data-lesson-next="${next.id}">Next: ${esc(next.title)} →</button></div>` : "");
  const nb = $("lesson").querySelector("[data-lesson-next]");
  if (nb) nb.onclick = () => { lessonId = nb.dataset.lessonNext; store.set("lesson", lessonId); renderLesson(); window.scrollTo({ top: 0, behavior: "smooth" }); };
  renderLessonNecks();
}

function renderLessonNecks() {
  document.querySelectorAll("#lesson svg[data-neck]").forEach((svg) => {
    const kind = svg.dataset.neck;
    const marks = new Map();
    if (kind === "naturals") {
      [0, 2, 4, 5, 7, 9, 11].forEach((p) => marks.set(p, { label: noteName(p), role: p === 0 ? "root" : "note" }));
    } else if (kind === "cmaj") {
      makeChord(0, "maj").tones.forEach((t) => marks.set(t.pc, { label: t.label === "R" ? "C" : t.name, role: t.role }));
    } else if (kind === "cscale") {
      MAJOR_SCALE.forEach((s, i) => marks.set(s, { label: noteName(s), role: i === 0 ? "root" : "note" }));
    }
    renderNeck(svg, { marks, onPick: (m) => playNote(m), onlyString: kind === "cscale" ? 1 : null });
  });
  const sel = $("lessonKey");
  if (sel) {
    const draw = () => {
      const k = { tonic: +sel.value, mode: "major" };
      $("lessonDiatonic").innerHTML = diatonicChords(k).map((x) => `
        <button type="button" class="dchip" data-chord="${x.chord.rootPc}:${x.chord.quality}">
          <small>${x.numeral}</small><b>${pretty(x.chord.symbol)}</b><span class="fn">${FUNCTION_SHORT[x.fn]}</span>
        </button>`).join("");
    };
    sel.onchange = draw;
    draw();
  }
}

// ---------------------------------------------------------------------------
// Boot

setDisplay(state.display);
renderHistory();
updateListenUI();
const startTab = location.hash.slice(1);
setTab(["listen", "practice", "learn"].includes(startTab) ? startTab : "listen");
