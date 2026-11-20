// Pitch & chord detection from microphone audio.
//
// Pipeline per frame (~25 fps):
//   1. FFT magnitude spectrum (AnalyserNode, 16k bins window) → spectral peaks.
//   2. Harmonic grouping: walk peaks low → high, a peak that sits on an integer multiple
//      of an already accepted fundamental is absorbed as its harmonic, otherwise it becomes
//      a new note. This is what stops the 3rd/5th harmonics from inventing chord tones.
//   3. Pitch-class weights (chroma) from the notes, smoothed over time.
//   4. Chord = best cosine match against all root × quality templates, nudged by the bass note.
//   5. YIN on the raw waveform gives a precise single-note pitch for the tuner.

import { QUALITIES, QUALITY_KEYS, makeChord, freqToMidi, chordKey } from "./theory.js";

const MIN_F = 70; // just below drop-D low D (73.4 Hz)
const MAX_FUND = 1400; // ~fret 22 on the high e
const MAX_PEAK = 4200;

/**
 * Find spectral peaks. `db` is AnalyserNode float dB data.
 * Returns [{f, mag}] sorted by frequency.
 */
export function findPeaks(db, sampleRate, fftSize) {
  const binHz = sampleRate / fftSize;
  const lo = Math.max(2, Math.floor(MIN_F / binHz));
  const hi = Math.min(db.length - 3, Math.ceil(MAX_PEAK / binHz));
  const mags = new Float32Array(hi + 3);
  let maxMag = 0;
  for (let i = lo - 2; i <= hi + 2; i++) {
    const m = Math.pow(10, db[i] / 20);
    mags[i] = m;
    if (i >= lo && i <= hi && m > maxMag) maxMag = m;
  }
  if (maxMag <= 0) return [];
  // Noise floor: median of the band.
  const band = Array.from(mags.subarray(lo, hi)).sort((a, b) => a - b);
  const median = band[band.length >> 1] || 0;
  const thresh = Math.max(median * 6, maxMag * 0.035);
  const peaks = [];
  for (let i = lo; i <= hi; i++) {
    const m = mags[i];
    if (m < thresh || m < mags[i - 1] || m < mags[i + 1] || m < mags[i - 2] || m < mags[i + 2]) continue;
    // Parabolic interpolation on dB values for sub-bin frequency.
    const a = db[i - 1], b = db[i], c = db[i + 1];
    const denom = a - 2 * b + c;
    const delta = denom !== 0 ? (0.5 * (a - c)) / denom : 0;
    peaks.push({ f: (i + delta) * binHz, mag: m });
  }
  // Keep the strongest 40 to bound work in noisy rooms.
  if (peaks.length > 40) {
    peaks.sort((x, y) => y.mag - x.mag);
    peaks.length = 40;
    peaks.sort((x, y) => x.f - y.f);
  }
  return peaks;
}

const cents = (f, ref) => 1200 * Math.log2(f / ref);

/**
 * Group peaks into notes (fundamentals + absorbed harmonics).
 * Returns [{f, midi, strength, mag}] where strength includes harmonic support.
 */
export function groupHarmonics(peaks) {
  const maxMag = peaks.reduce((m, p) => Math.max(m, p.mag), 0);
  const notes = [];
  for (const p of peaks) {
    let absorbed = false;
    for (const n of notes) {
      const h = Math.round(p.f / n.f);
      if (h >= 2 && h <= 12 && Math.abs(cents(p.f, h * n.f)) < 35) {
        n.strength += p.mag;
        n.harmonics++;
        absorbed = true;
        break;
      }
    }
    if (absorbed || p.f > MAX_FUND) continue;
    // Weak isolated peaks are usually noise or sympathetic ringing.
    if (p.mag < maxMag * 0.06) continue;
    notes.push({ f: p.f, mag: p.mag, strength: p.mag, harmonics: 0, midi: freqToMidi(p.f) });
  }
  return notes;
}

/** Chroma vector (12) from notes, using compressed strength. */
export function chromaFromNotes(notes) {
  const chroma = new Float32Array(12);
  for (const n of notes) {
    const p = ((Math.round(n.midi) % 12) + 12) % 12;
    chroma[p] += Math.sqrt(n.strength);
  }
  return chroma;
}

// Precomputed chord templates.
const TEMPLATES = [];
for (let root = 0; root < 12; root++) {
  for (const q of QUALITY_KEYS) {
    const v = new Float32Array(12);
    for (const iv of QUALITIES[q].ints) v[(root + iv.semi) % 12] = iv.semi === 0 ? 1.1 : 1;
    let norm = 0;
    for (let i = 0; i < 12; i++) norm += v[i] * v[i];
    TEMPLATES.push({ root, q, v, norm: Math.sqrt(norm), size: QUALITIES[q].ints.length });
  }
}

/**
 * Rank chords for a chroma vector. Returns [{root, q, score}] best first.
 * `bassPc` (lowest confident note) gives the matching root a bonus.
 */
export function rankChords(chroma, bassPc) {
  let cnorm = 0, cmax = 0;
  for (let i = 0; i < 12; i++) { cnorm += chroma[i] * chroma[i]; cmax = Math.max(cmax, chroma[i]); }
  cnorm = Math.sqrt(cnorm);
  if (cnorm === 0) return [];
  const out = [];
  for (const t of TEMPLATES) {
    let dot = 0, missing = 0;
    for (let i = 0; i < 12; i++) {
      dot += chroma[i] * t.v[i];
      if (t.v[i] > 0 && chroma[i] < cmax * 0.12) missing++;
    }
    let score = dot / (cnorm * t.norm);
    score -= 0.035 * QUALITIES[t.q].complexity;
    score -= 0.08 * missing;
    if (bassPc === t.root) score += 0.07;
    out.push({ root: t.root, q: t.q, score });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

/** YIN pitch estimate on a time-domain buffer. Returns {f, clarity} or null. */
export function yin(buf, sampleRate, threshold = 0.15) {
  const N = buf.length >> 1;
  const tauMin = Math.floor(sampleRate / MAX_FUND);
  const tauMax = Math.min(N - 1, Math.ceil(sampleRate / MIN_F));
  const d = new Float32Array(tauMax + 1);
  for (let tau = 1; tau <= tauMax; tau++) {
    let s = 0;
    for (let i = 0; i < N; i++) {
      const x = buf[i] - buf[i + tau];
      s += x * x;
    }
    d[tau] = s;
  }
  // Cumulative mean normalized difference.
  let running = 0;
  d[0] = 1;
  for (let tau = 1; tau <= tauMax; tau++) {
    running += d[tau];
    d[tau] = running > 0 ? (d[tau] * tau) / running : 1;
  }
  let tau = -1;
  for (let t = tauMin; t <= tauMax; t++) {
    if (d[t] < threshold) {
      while (t + 1 <= tauMax && d[t + 1] < d[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau === -1) return null;
  // Parabolic refinement.
  const x0 = d[tau - 1], x1 = d[tau], x2 = tau + 1 <= tauMax ? d[tau + 1] : x1;
  const denom = x0 - 2 * x1 + x2;
  const shift = denom !== 0 ? (0.5 * (x0 - x2)) / denom : 0;
  return { f: sampleRate / (tau + shift), clarity: 1 - x1 };
}

/**
 * Listener: owns the mic stream and emits analysis frames.
 * onFrame({level, silent, notes, chroma, chord, alternatives, pitch, stableChord})
 */
export class Listener {
  constructor(onFrame) {
    this.onFrame = onFrame;
    this.running = false;
    this.smooth = new Float32Array(12);
    this.candidate = null;
    this.candidateFrames = 0;
    this.stableChord = null;
    this.stableMode = null;
    this.noiseRms = 0.002;
  }

  async start() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 16384;
    this.analyser.smoothingTimeConstant = 0;
    this.analyser.minDecibels = -120;
    this.analyser.maxDecibels = 0;
    this.source.connect(this.analyser);
    this.freq = new Float32Array(this.analyser.frequencyBinCount);
    this.time = new Float32Array(this.analyser.fftSize);
    this.running = true;
    this.timer = setInterval(() => this.tick(), 40);
  }

  stop() {
    this.running = false;
    clearInterval(this.timer);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close();
  }

  tick() {
    const { analyser, ctx } = this;
    analyser.getFloatTimeDomainData(this.time);
    // Level from the most recent ~85 ms.
    const recent = this.time.subarray(this.time.length - 4096);
    let sum = 0;
    for (let i = 0; i < recent.length; i++) sum += recent[i] * recent[i];
    const rms = Math.sqrt(sum / recent.length);
    // Track the room's noise floor slowly, so the gate adapts to quiet or noisy mics.
    if (rms < this.noiseRms * 2) this.noiseRms = 0.98 * this.noiseRms + 0.02 * rms;
    const silent = rms < Math.max(0.004, this.noiseRms * 3);
    const level = Math.min(1, Math.max(0, (20 * Math.log10(rms + 1e-9) + 60) / 54));

    if (silent) {
      for (let i = 0; i < 12; i++) this.smooth[i] *= 0.8;
      this.candidateFrames = 0;
      this.onFrame({ level, silent: true, notes: [], chroma: this.smooth, stableChord: this.stableChord, stableMode: this.stableMode, pitch: null });
      return;
    }

    analyser.getFloatFrequencyData(this.freq);
    const peaks = findPeaks(this.freq, ctx.sampleRate, analyser.fftSize);
    const notes = groupHarmonics(peaks);
    const chroma = chromaFromNotes(notes);
    let cmax = 0;
    for (let i = 0; i < 12; i++) cmax = Math.max(cmax, chroma[i]);
    for (let i = 0; i < 12; i++) this.smooth[i] = 0.55 * this.smooth[i] + 0.45 * (cmax ? chroma[i] / cmax : 0);

    const pitchRaw = yin(recent, ctx.sampleRate);
    const pitch = pitchRaw && pitchRaw.clarity > 0.8 ? { ...pitchRaw, midi: freqToMidi(pitchRaw.f) } : null;

    let smax = 0;
    for (let i = 0; i < 12; i++) smax = Math.max(smax, this.smooth[i]);
    const activePcs = [];
    for (let i = 0; i < 12; i++) if (this.smooth[i] > smax * 0.3) activePcs.push(i);

    const bass = notes.find((n) => n.strength > (notes[0]?.strength || 0) * 0.25 && this.smooth[((Math.round(n.midi) % 12) + 12) % 12] > smax * 0.3);
    const bassPc = bass ? ((Math.round(bass.midi) % 12) + 12) % 12 : null;

    let chord = null, alternatives = [];
    if (activePcs.length >= 2) {
      const ranked = rankChords(this.smooth, bassPc);
      if (ranked.length && ranked[0].score > 0.72) {
        chord = makeChord(ranked[0].root, ranked[0].q, bassPc);
        alternatives = ranked.slice(1, 4).filter((r) => r.score > ranked[0].score - 0.12).map((r) => makeChord(r.root, r.q));
      }
    }

    // Debounce: a chord must win ~5 frames in a row (~200 ms) before it is shown.
    const key = chord ? chordKey(chord) + (chord.slash || "") : activePcs.length === 1 ? "note" : "";
    if (key === this.candidate) this.candidateFrames++;
    else { this.candidate = key; this.candidateFrames = 1; }
    if (chord && this.candidateFrames >= 5) { this.stableChord = chord; this.stableMode = "chord"; }
    if (key === "note" && this.candidateFrames >= 4) this.stableMode = "note";

    this.onFrame({ level, silent: false, notes, chroma: this.smooth, activePcs, bassPc, chord, alternatives, pitch, stableChord: this.stableChord, stableMode: this.stableMode, peaks });
  }
}
