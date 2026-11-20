// Music theory core: notes, intervals, chord qualities, keys, voicings.

export const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];

// Common guitarist spellings for chord roots / single notes.
export const ROOT_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
export const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const pc = (midi) => ((Math.round(midi) % 12) + 12) % 12;
export const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const freqToMidi = (f) => 69 + 12 * Math.log2(f / 440);
export const noteName = (p) => ROOT_NAMES[((p % 12) + 12) % 12];
export const noteWithOctave = (midi) => noteName(pc(midi)) + (Math.floor(Math.round(midi) / 12) - 1);

/** Pretty-print accidentals. */
export const pretty = (s) => s.replace(/bb/g, "𝄫").replace(/(?<=[A-G])b/g, "♭").replace(/#/g, "♯");

/** Spell a note that is `semi` semitones and `deg` scale steps above a root name like "Eb". */
export function spell(rootName, semi, deg) {
  const letterIdx = LETTERS.indexOf(rootName[0]);
  const rootAcc = rootName.slice(1) === "#" ? 1 : rootName.slice(1) === "b" ? -1 : 0;
  const rootPc = (LETTER_PC[letterIdx] + rootAcc + 12) % 12;
  const li = (letterIdx + deg - 1) % 7;
  const target = (rootPc + semi) % 12;
  let diff = (target - LETTER_PC[li] + 12) % 12;
  if (diff > 6) diff -= 12;
  const acc = diff === 0 ? "" : diff > 0 ? "#".repeat(diff) : "b".repeat(-diff);
  return LETTERS[li] + acc;
}

/** Interval vocabulary (by semitones above the root), for lessons and labels. */
export const INTERVAL_NAMES = [
  { semi: 0, short: "R", name: "unison / root", feel: "the home note" },
  { semi: 1, short: "♭2", name: "minor second", feel: "crunchy, the 'Jaws' interval" },
  { semi: 2, short: "2", name: "major second", feel: "a whole step, a step up the scale" },
  { semi: 3, short: "♭3", name: "minor third", feel: "the sound of minor, darker" },
  { semi: 4, short: "3", name: "major third", feel: "the sound of major, bright" },
  { semi: 5, short: "4", name: "perfect fourth", feel: "open, 'Here Comes the Bride'" },
  { semi: 6, short: "♭5", name: "tritone", feel: "the most unstable interval" },
  { semi: 7, short: "5", name: "perfect fifth", feel: "strong and neutral, the power chord" },
  { semi: 8, short: "♭6", name: "minor sixth", feel: "bittersweet" },
  { semi: 9, short: "6", name: "major sixth", feel: "sweet, 'My Bonnie'" },
  { semi: 10, short: "♭7", name: "minor seventh", feel: "bluesy, wants to move" },
  { semi: 11, short: "7", name: "major seventh", feel: "dreamy, leaning up to the octave" },
  { semi: 12, short: "8", name: "octave", feel: "the same note, higher" },
];

const I = (semi, label, deg, name) => ({ semi, label, deg, name });
const R = I(0, "R", 1, "root");
const M3 = I(4, "3", 3, "major third");
const m3 = I(3, "♭3", 3, "minor third");
const P5 = I(7, "5", 5, "perfect fifth");

/**
 * Chord qualities. `role` drives colors: root, third, fifth, seventh, color (6/9/sus tones).
 * `complexity` is a small prior: simpler chords win ties.
 */
export const QUALITIES = {
  maj: {
    symbol: "", name: "major", ints: [R, M3, P5], complexity: 0, family: "maj",
    feel: "Bright, stable, finished. The default 'happy' chord.",
    why: "A major triad stacks a major third (4 frets) on the root, then a minor third (3 frets) on top of that, which lands on the perfect fifth.",
  },
  min: {
    symbol: "m", name: "minor", ints: [R, m3, P5], complexity: 0, family: "min",
    feel: "Darker, sadder, but still stable and at rest.",
    why: "Same as major except the third is lowered by one fret: minor third (3 frets) first, then a major third on top. That one fret is the whole difference between happy and sad.",
  },
  5: {
    symbol: "5", name: "power chord", ints: [R, P5], complexity: 0.5, family: "5",
    feel: "Heavy and neutral. Neither happy nor sad, which is why rock loves it under distortion.",
    why: "Only the root and the fifth. With no third, there is nothing to say major or minor.",
  },
  7: {
    symbol: "7", name: "dominant seventh", ints: [R, M3, P5, I(10, "♭7", 7, "minor seventh")], complexity: 1, family: "dom",
    feel: "Bluesy and restless. It wants to resolve to the chord a fifth below (G7 → C).",
    why: "A major triad plus a minor seventh (2 frets below the octave). The 3 and ♭7 form a tritone, the tense interval that pulls toward resolution.",
  },
  maj7: {
    symbol: "maj7", name: "major seventh", ints: [R, M3, P5, I(11, "7", 7, "major seventh")], complexity: 1, family: "maj",
    feel: "Dreamy, soft, jazzy. Bossa nova and neo-soul live here.",
    why: "A major triad plus a major seventh, one fret below the octave. That note rubs gently against the root.",
  },
  m7: {
    symbol: "m7", name: "minor seventh", ints: [R, m3, P5, I(10, "♭7", 7, "minor seventh")], complexity: 1, family: "min",
    feel: "Mellow and smooth, less dramatic than plain minor.",
    why: "A minor triad plus a minor seventh. Interesting fact: Am7 contains exactly the notes of a C major triad plus an A.",
  },
  sus2: {
    symbol: "sus2", name: "suspended second", ints: [R, I(2, "2", 2, "major second"), P5], complexity: 0.8, family: "sus",
    feel: "Open, airy, unresolved.",
    why: "The third is replaced by the 2nd. No third means it is neither major nor minor, so it floats.",
  },
  sus4: {
    symbol: "sus4", name: "suspended fourth", ints: [R, I(5, "4", 4, "perfect fourth"), P5], complexity: 0.8, family: "sus",
    feel: "Tense in a pleasant way. It wants to drop back to the major chord (Dsus4 → D).",
    why: "The third is replaced by the 4th, one fret above the major third, so it 'hangs' and wants to fall back.",
  },
  dim: {
    symbol: "dim", name: "diminished", ints: [R, m3, I(6, "♭5", 5, "diminished fifth")], complexity: 1, family: "dim",
    feel: "Unstable, spooky, a passing chord.",
    why: "Two minor thirds stacked. The ♭5 makes a tritone with the root, so nothing feels settled.",
  },
  aug: {
    symbol: "aug", name: "augmented", ints: [R, M3, I(8, "♯5", 5, "augmented fifth")], complexity: 1.2, family: "aug",
    feel: "Dreamy but unsettled, like something is rising.",
    why: "Two major thirds stacked. The raised fifth splits the octave into three equal parts.",
  },
  6: {
    symbol: "6", name: "major sixth", ints: [R, M3, P5, I(9, "6", 6, "major sixth")], complexity: 1.1, family: "maj",
    feel: "Sweet and vintage. Think 50s endings.",
    why: "A major triad plus the 6th. Same notes as the relative minor seventh (C6 = Am7), so the bass note decides the name.",
  },
  m6: {
    symbol: "m6", name: "minor sixth", ints: [R, m3, P5, I(9, "6", 6, "major sixth")], complexity: 1.2, family: "min",
    feel: "Mysterious, film-noir minor.",
    why: "A minor triad plus a major 6th.",
  },
  add9: {
    symbol: "add9", name: "added ninth", ints: [R, M3, P5, I(2, "9", 9, "ninth")], complexity: 1.1, family: "maj",
    feel: "Major with a sparkle on top.",
    why: "A major triad plus the 9th, which is the 2nd an octave up. Unlike sus2 it keeps the third.",
  },
  m7b5: {
    symbol: "m7♭5", name: "half-diminished", ints: [R, m3, I(6, "♭5", 5, "diminished fifth"), I(10, "♭7", 7, "minor seventh")], complexity: 1.4, family: "dim",
    feel: "Dark and questioning. The ii chord of minor keys in jazz.",
    why: "A diminished triad plus a minor seventh.",
  },
  dim7: {
    symbol: "dim7", name: "diminished seventh", ints: [R, m3, I(6, "♭5", 5, "diminished fifth"), I(9, "𝄫7", 7, "diminished seventh")], complexity: 1.4, family: "dim",
    feel: "Maximum suspense: silent-film villain.",
    why: "Minor thirds stacked all the way up. It is symmetric, so every note can act as the root.",
  },
};

export const QUALITY_KEYS = Object.keys(QUALITIES);

export function roleOf(interval) {
  if (interval.semi === 0) return "root";
  if (interval.deg === 3) return "third";
  if (interval.deg === 5) return "fifth";
  if (interval.deg === 7) return "seventh";
  return "color";
}

/** Build a full chord description from root pitch class and quality key. */
export function makeChord(rootPc, quality, bassPc = null) {
  const q = QUALITIES[quality];
  const rootName = ROOT_NAMES[rootPc];
  const tones = q.ints.map((iv) => ({
    ...iv,
    ivName: iv.name,
    pc: (rootPc + iv.semi) % 12,
    name: spell(rootName, iv.semi, iv.deg),
    role: roleOf(iv),
  }));
  const slash = bassPc != null && bassPc !== rootPc && tones.some((t) => t.pc === bassPc)
    ? tones.find((t) => t.pc === bassPc).name
    : null;
  return {
    rootPc, quality, rootName, tones, q,
    pcs: tones.map((t) => t.pc),
    symbol: rootName + q.symbol + (slash ? "/" + slash : ""),
    baseSymbol: rootName + q.symbol,
    fullName: `${rootName} ${q.name}` + (slash ? `, with ${slash} in the bass` : ""),
    slash,
  };
}

export const chordKey = (c) => (c ? `${c.rootPc}:${c.quality}` : "");

// ----------------------------------------------------------------------------
// Keys

export const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
export const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];
const MAJOR_TRIADS = ["maj", "min", "min", "maj", "maj", "min", "dim"];
const MINOR_TRIADS = ["min", "dim", "maj", "min", "min", "maj", "maj"];
const MAJOR_SEVENTHS = ["maj7", "m7", "m7", "maj7", "7", "m7", "m7b5"];
const MINOR_SEVENTHS = ["m7", "m7b5", "maj7", "m7", "m7", "maj7", "7"];
const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"];

export const FUNCTION_OF_DEGREE = {
  major: ["tonic", "predominant", "tonic", "predominant", "dominant", "tonic", "dominant"],
  minor: ["tonic", "predominant", "tonic", "predominant", "dominant", "tonic", "dominant"],
};
export const FUNCTION_SHORT = { tonic: "home", predominant: "away", dominant: "tension" };
export const FUNCTION_TEXT = {
  tonic: "home, at rest",
  predominant: "moving away, sets up tension",
  dominant: "tension, wants to go home",
};

// Typical next moves by scale degree (0-based), taken from common-practice and pop harmony.
const NEXT_MAJOR = { 0: [3, 4, 5, 1], 1: [4, 6], 2: [5, 3], 3: [4, 0, 1], 4: [0, 5], 5: [3, 1, 4], 6: [0] };
const NEXT_MINOR = { 0: [3, 5, 6, 4], 1: [4], 2: [5, 3], 3: [4, 0, 6], 4: [0, 5], 5: [6, 3, 1], 6: [2, 0] };

export function keyName(k) {
  return ROOT_NAMES[k.tonic] + (k.mode === "major" ? " major" : " minor");
}

/** Diatonic chords of a key, with numerals and function. */
export function diatonicChords(k) {
  const scale = k.mode === "major" ? MAJOR_SCALE : MINOR_SCALE;
  const triads = k.mode === "major" ? MAJOR_TRIADS : MINOR_TRIADS;
  return scale.map((s, deg) => {
    const quality = triads[deg];
    const chord = makeChord((k.tonic + s) % 12, quality);
    return { deg, chord, numeral: numeralFor(deg, quality), fn: FUNCTION_OF_DEGREE[k.mode][deg] };
  });
}

function numeralFor(deg, quality, prefix = "") {
  const fam = QUALITIES[quality].family;
  let n = NUMERALS[deg];
  if (fam === "min" || fam === "dim") n = n.toLowerCase();
  let suffix = "";
  if (quality === "dim") suffix = "°";
  else if (quality === "dim7") suffix = "°7";
  else if (quality === "m7b5") suffix = "ø7";
  else if (quality === "aug") suffix = "+";
  else if (["7", "maj7", "m7", "6", "m6", "sus2", "sus4", "add9", "5"].includes(quality)) suffix = QUALITIES[quality].symbol.replace(/^m(?!aj)/, "");
  return prefix + n + suffix;
}

/** Roman numeral for any chord relative to a key; flags non-diatonic chords as borrowed. */
export function romanFor(chord, k) {
  const scale = k.mode === "major" ? MAJOR_SCALE : MINOR_SCALE;
  const rel = (chord.rootPc - k.tonic + 12) % 12;
  let deg = scale.indexOf(rel);
  let prefix = "";
  if (deg === -1) {
    // Chromatic root: name it as flattened degree above (e.g. bVII in major).
    const up = scale.indexOf((rel + 1) % 12);
    if (up !== -1) { deg = up; prefix = "♭"; }
    else { deg = scale.indexOf((rel + 11) % 12); prefix = "♯"; }
  }
  const diatonic = !prefix && fitsDegree(chord.quality, k, deg) === 1;
  return { numeral: numeralFor(deg, chord.quality, prefix), deg, diatonic, fn: prefix ? null : FUNCTION_OF_DEGREE[k.mode][deg] };
}

function fitsDegree(quality, k, deg) {
  const triad = (k.mode === "major" ? MAJOR_TRIADS : MINOR_TRIADS)[deg];
  const sev = (k.mode === "major" ? MAJOR_SEVENTHS : MINOR_SEVENTHS)[deg];
  if (quality === triad || quality === sev) return 1;
  // Harmonic minor: major V / V7 is idiomatic in minor keys.
  if (k.mode === "minor" && deg === 4 && (quality === "maj" || quality === "7")) return 1;
  const fam = QUALITIES[quality].family;
  const tfam = QUALITIES[triad].family;
  if (fam === "5" || fam === "sus") return tfam === "dim" ? 0.3 : 0.8;
  if (quality === "6" || quality === "add9") return tfam === "maj" ? 0.9 : 0.2;
  if (quality === "m6") return tfam === "min" ? 0.8 : 0.2;
  if (quality === "7" && tfam === "maj") return 0.6;
  return 0.2;
}

/**
 * Guess the key from recent chords (oldest first). Returns ranked keys with scores, or [] if too little data.
 */
export function guessKey(history) {
  const recent = history.slice(-12);
  const distinct = new Set(recent.map((c) => c.rootPc + ":" + c.quality));
  if (distinct.size < 2) return [];
  const out = [];
  for (let tonic = 0; tonic < 12; tonic++) {
    for (const mode of ["major", "minor"]) {
      const k = { tonic, mode };
      const scale = mode === "major" ? MAJOR_SCALE : MINOR_SCALE;
      let score = 0;
      recent.forEach((c, i) => {
        const w = Math.pow(0.88, recent.length - 1 - i);
        const deg = scale.indexOf((c.rootPc - tonic + 12) % 12);
        if (deg === -1) score -= 0.7 * w;
        else {
          score += fitsDegree(c.quality, k, deg) * w;
          if (deg === 0) score += 0.45 * w; // tonic chord present
        }
      });
      // Where the song started is a strong tonic cue; use the start of the whole history,
      // not of the sliding window (which would drift through the loop).
      const first = history[0];
      const last = recent[recent.length - 1];
      if (first && first.rootPc === tonic) score += 0.6;
      if (last && last.rootPc === tonic) score += 0.15;
      if (mode === "major") score += 0.01; // tiny tie-break toward major
      out.push({ key: k, score });
    }
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

/** Suggested next chords (degrees) from the current chord's degree. */
export function nextDegrees(k, deg) {
  return (k.mode === "major" ? NEXT_MAJOR : NEXT_MINOR)[deg] || [];
}

// ----------------------------------------------------------------------------
// Guitar

export const TUNING = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4, low to high
export const STRING_NAMES = ["E", "A", "D", "G", "B", "e"];

const X = null;
// Movable shapes: fret offsets per string (low E → high e) relative to root fret on the root string.
const SHAPES = {
  E: {
    rootString: 0,
    maj: [0, 2, 2, 1, 0, 0], min: [0, 2, 2, 0, 0, 0], 7: [0, 2, 0, 1, 0, 0], maj7: [0, 2, 1, 1, 0, 0],
    m7: [0, 2, 0, 0, 0, 0], sus4: [0, 2, 2, 2, 0, 0], sus2: [0, 2, 4, 4, 0, 0], 5: [0, 2, 2, X, X, X],
    6: [0, 2, 2, 1, 2, 0], m6: [0, 2, 2, 0, 2, 0], dim: [0, 1, 2, 0, X, X], aug: [0, 3, 2, 1, 1, 0],
    add9: [0, 2, 4, 1, 0, 0], m7b5: [0, 1, 0, 0, X, X], dim7: [0, 1, 2, 0, 2, 0],
  },
  A: {
    rootString: 1,
    maj: [X, 0, 2, 2, 2, 0], min: [X, 0, 2, 2, 1, 0], 7: [X, 0, 2, 0, 2, 0], maj7: [X, 0, 2, 1, 2, 0],
    m7: [X, 0, 2, 0, 1, 0], sus2: [X, 0, 2, 2, 0, 0], sus4: [X, 0, 2, 2, 3, 0], 5: [X, 0, 2, 2, X, X],
    6: [X, 0, 2, 2, 2, 2], m6: [X, 0, 2, 2, 1, 2], dim: [X, 0, 1, 2, 1, X], aug: [X, 0, 3, 2, 2, 1],
    add9: [X, 0, 2, 4, 2, 0], m7b5: [X, 0, 1, 0, 1, X], dim7: [X, 0, 1, 2, 1, 2],
  },
  D: {
    rootString: 2,
    maj: [X, X, 0, 2, 3, 2], min: [X, X, 0, 2, 3, 1], 7: [X, X, 0, 2, 1, 2], maj7: [X, X, 0, 2, 2, 2],
    m7: [X, X, 0, 2, 1, 1], sus2: [X, X, 0, 2, 3, 0], sus4: [X, X, 0, 2, 3, 3], 5: [X, X, 0, 2, 3, X],
    6: [X, X, 0, 2, 0, 2], m6: [X, X, 0, 2, 0, 1], dim: [X, X, 0, 1, 3, 1], aug: [X, X, 0, 3, 3, 2],
    m7b5: [X, X, 0, 1, 1, 1], dim7: [X, X, 0, 1, 0, 1],
  },
};

// Open-position favourites, written as fret strings low E → high e.
const OPEN = {
  "0:maj": "x32010", "9:maj": "x02220", "7:maj": "320003", "4:maj": "022100", "2:maj": "xx0232",
  "9:min": "x02210", "4:min": "022000", "2:min": "xx0231", "11:min": "x24432",
  "9:7": "x02020", "11:7": "x21202", "0:7": "x32310", "2:7": "xx0212", "4:7": "020100", "7:7": "320001",
  "9:maj7": "x02120", "0:maj7": "x32000", "2:maj7": "xx0222", "5:maj7": "xx3210", "7:maj7": "320002",
  "9:m7": "x02010", "2:m7": "xx0211", "4:m7": "022030",
  "9:sus2": "x02200", "9:sus4": "x02230", "2:sus2": "xx0230", "2:sus4": "xx0233", "4:sus4": "022200",
  "4:5": "022xxx", "9:5": "x022xx", "2:5": "xx023x", "0:add9": "x32030", "7:6": "320000", "5:maj": "133211",
};

const parseFrets = (s) => [...s].map((ch) => (ch === "x" ? null : parseInt(ch, 10)));

/** Candidate voicings for a chord: open shape (if any) plus E/A/D movable shapes. */
export function voicingsFor(chord) {
  const out = [];
  const seen = new Set();
  const push = (frets, label, detail) => {
    const sig = frets.join(",");
    if (seen.has(sig)) return;
    seen.add(sig);
    out.push({ frets, label, detail, notes: frets.map((f, s) => (f == null ? null : TUNING[s] + f)) });
  };
  const open = OPEN[`${chord.rootPc}:${chord.quality}`];
  if (open) push(parseFrets(open), "Open chord", "Uses open strings, the first shape most people learn.");
  for (const shapeName of ["E", "A", "D"]) {
    const shape = SHAPES[shapeName];
    const offs = shape[chord.quality];
    if (!offs) continue;
    const base = (chord.rootPc - pc(TUNING[shape.rootString]) + 12) % 12;
    const frets = offs.map((o) => (o == null ? null : o + base));
    const sName = STRING_NAMES[shape.rootString];
    if (base === 0) {
      push(frets, `Open ${shapeName}-shape`, `Root is the open ${sName} string.`);
    } else {
      push(
        frets,
        `${shapeName}-shape` + (shapeName === "D" ? "" : " barre"),
        `Root on the ${sName} string, fret ${base}. This is the open ${shapeName} chord shape slid up the neck` +
          (shapeName === "D" ? "." : ", with your index finger barring where the nut used to be.")
      );
    }
  }
  return out.slice(0, 3);
}

/** Where a pitch class lives on the neck (string index, fret) up to maxFret. */
export function positionsOf(pitchClass, maxFret = 12) {
  const out = [];
  TUNING.forEach((open, s) => {
    for (let f = 0; f <= maxFret; f++) if (pc(open + f) === pitchClass) out.push({ s, f });
  });
  return out;
}

export { SHAPES as _SHAPES, OPEN as _OPEN };

// ----------------------------------------------------------------------------
// Song helpers: progression loops, solo scales, capo

export const PENTATONIC = { major: [0, 2, 4, 7, 9], minor: [0, 3, 5, 7, 10] };

const famOf = (q) => {
  const f = QUALITIES[q].family;
  if (f === "dom") return "maj";
  if (f === "sus" || f === "5") return "any";
  if (f === "aug") return "maj";
  return f; // maj | min | dim
};

// Well-known progressions as [semitones above tonic, family] steps.
const FAMOUS = [
  { steps: [[0, "maj"], [7, "maj"], [9, "min"], [5, "maj"]], numerals: "I–V–vi–IV", name: "the four-chord pop progression", mode: "major" },
  { steps: [[9, "min"], [5, "maj"], [0, "maj"], [7, "maj"]], numerals: "vi–IV–I–V", name: "the pop progression started on the minor chord (sadder)", mode: "major" },
  { steps: [[0, "maj"], [9, "min"], [5, "maj"], [7, "maj"]], numerals: "I–vi–IV–V", name: "the 50s doo-wop progression", mode: "major" },
  { steps: [[0, "maj"], [5, "maj"], [7, "maj"]], numerals: "I–IV–V", name: "the folk / blues / rock-and-roll workhorse", mode: "major" },
  { steps: [[0, "maj"], [5, "maj"], [7, "maj"], [5, "maj"]], numerals: "I–IV–V–IV", name: "the garage-rock riff progression", mode: "major" },
  { steps: [[2, "min"], [7, "maj"], [0, "maj"]], numerals: "ii–V–I", name: "the jazz cadence", mode: "major" },
  { steps: [[0, "maj"], [10, "maj"], [5, "maj"]], numerals: "I–♭VII–IV", name: "the Mixolydian rock progression (borrowed ♭VII)", mode: "major" },
  { steps: [[0, "maj"], [5, "maj"]], numerals: "I–IV", name: "a two-chord vamp", mode: "major" },
  { steps: [[0, "maj"], [7, "maj"]], numerals: "I–V", name: "a two-chord vamp", mode: "major" },
  { steps: [[0, "min"], [10, "maj"], [8, "maj"], [7, "maj"]], numerals: "i–VII–VI–V", name: "the Andalusian cadence (flamenco)", mode: "minor" },
  { steps: [[0, "min"], [8, "maj"], [3, "maj"], [10, "maj"]], numerals: "i–VI–III–VII", name: "the epic minor pop progression", mode: "minor" },
  { steps: [[0, "min"], [8, "maj"], [10, "maj"]], numerals: "i–VI–VII", name: "the minor rock progression", mode: "minor" },
  { steps: [[0, "min"], [5, "min"], [7, "min"]], numerals: "i–iv–v", name: "natural-minor progression", mode: "minor" },
  { steps: [[0, "min"], [5, "min"], [7, "maj"]], numerals: "i–iv–V", name: "minor progression with the strong major V", mode: "minor" },
  { steps: [[0, "min"], [7, "maj"]], numerals: "i–V", name: "a minor two-chord vamp", mode: "minor" },
];

/**
 * Detect a repeating chord loop at the end of the history (at least two full cycles).
 * Returns {chords, famous?: {numerals, name, tonic}} or null.
 */
export function findLoop(history, preferTonic = null) {
  // Same chord for loop purposes: same root and compatible type (a power chord matches the
  // major or minor chord on its root, since it's that chord without the third).
  const same = (a, b) => {
    if (a.rootPc !== b.rootPc) return false;
    const fa = famOf(a.quality), fb = famOf(b.quality);
    return fa === fb || fa === "any" || fb === "any";
  };
  const L = history.length;
  for (let p = 2; p <= 6; p++) {
    if (L < 2 * p) break;
    let ok = true;
    for (let i = 0; i < p; i++) if (!same(history[L - 1 - i], history[L - 1 - p - i])) { ok = false; break; }
    if (!ok) continue;
    // Name each step by the fuller of its two occurrences (F rather than F5).
    const loop = history.slice(-p).map((c, i) => {
      const other = history[L - 2 * p + i];
      return QUALITIES[c.quality].family === "5" || QUALITIES[c.quality].family === "sus" ? other : c;
    });
    // Try every rotation and tonic against the famous list; prefer the guessed key's tonic.
    let found = null;
    const tonics = preferTonic != null ? [preferTonic, ...[...Array(12).keys()].filter((x) => x !== preferTonic)] : [...Array(12).keys()];
    outer: for (const tonic of tonics) {
      for (const f of FAMOUS) {
        if (f.steps.length !== p) continue;
        for (let r = 0; r < p; r++) {
          const rot = loop.slice(r).concat(loop.slice(0, r));
          const match = rot.every((c, i) => {
            const [semi, fam] = f.steps[i];
            const cf = famOf(c.quality);
            return (c.rootPc - tonic + 12) % 12 === semi && (cf === fam || cf === "any");
          });
          if (match) { found = { ...f, tonic, chords: rot }; break outer; }
        }
      }
    }
    return { chords: found ? found.chords : loop, famous: found };
  }
  return null;
}

/** Chord as fingered with a capo: the shape name is the sounding chord moved down by the capo. */
export function shapeWithCapo(chord, capo) {
  if (!capo) return chord;
  return makeChord((chord.rootPc - capo + 12) % 12, chord.quality);
}
