// Pitch & chord detection from microphone audio.
//
// Pipeline per frame (every ~20 ms):
//   1. Strum (onset) detection from short-term energy. An onset resets smoothing so the
//      display follows chord changes immediately instead of waiting for the old chord to fade.
//   2. Own FFT (Blackman window, zero-padded) of the most recent audio → spectral peaks.
//      Right after an onset the window only covers audio since the strum.
//   3. Harmonic grouping: walk peaks low → high, a peak on an integer multiple of an accepted
//      fundamental is absorbed as its overtone, otherwise it becomes a new note.
//   4. Pitch-class weights (chroma), lightly smoothed.
//   5. Chord = best cosine match against all root × quality templates, nudged by the bass note.
//   6. YIN on the raw waveform for a precise single-note pitch (tuner).
//
// `Analyzer` is pure (no Web Audio), so the exact same code runs in tests on WAV files.

import { QUALITIES, QUALITY_KEYS, makeChord, freqToMidi, chordKey } from "./theory.js";

const MIN_F = 70; // just below drop-D low D (73.4 Hz)
const MAX_FUND = 1400; // ~fret 22 on the high e
const MAX_PEAK = 4200;
const pcOf = (midi) => ((Math.round(midi) % 12) + 12) % 12;

export const DEFAULTS = {
  win: 8192, // analysis window (samples at 48 kHz ≈ 171 ms)
  pad: 16384, // zero-padded FFT size, for finer peak interpolation
  minWin: 4096, // shortest post-onset window (≈ 85 ms)
  sticky: 0.08, // the displayed chord stays unless a rival beats its score by this much
  powerExtra: 3, // extra frames for power chords right after a strum
  stickyOnset: 0.08, // ...margin in the first 300 ms after a strum
  trimOnset: true, // analyse only audio since the last strum
  smooth: 0.45, // weight of the previous chroma (0 = none)
  commitFrames: 3, // frames a chord must win in a row to be shown
  onsetCommitFrames: 3, // ...right after a strum
  tailWeight: 0.5, // after a strum, the previous chord's notes count this much (they may just be ringing on)
  tailSec: 0.35,
  slashFrames: 8,
  harmMix: 0.5, // 0 = match grouped notes only, 1 = overtone-aware templates on the raw spectrum
  fluxFloor: 0, // >0: bins below median × this count as noise (0 = plain log magnitude, tested best)
  fluxAbs: 0.06, // minimum relative flux for a strum
  fluxMed: 1.5, // ...and this many times the recent median flux
  scoreMin: 0.72,
};

// ---------------------------------------------------------------------------
// FFT (iterative radix-2, precomputed tables)

class FFT {
  constructor(n) {
    this.n = n;
    this.rev = new Uint32Array(n);
    const bits = Math.log2(n);
    for (let i = 0; i < n; i++) {
      let r = 0;
      for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
      this.rev[i] = r;
    }
    this.cos = new Float64Array(n / 2);
    this.sin = new Float64Array(n / 2);
    for (let i = 0; i < n / 2; i++) {
      this.cos[i] = Math.cos((2 * Math.PI * i) / n);
      this.sin[i] = -Math.sin((2 * Math.PI * i) / n);
    }
    this.re = new Float64Array(n);
    this.im = new Float64Array(n);
  }

  /** Magnitude spectrum (first n/2 bins) of a real input (length n). */
  magnitudes(input, out) {
    const { n, rev, re, im } = this;
    for (let i = 0; i < n; i++) { re[rev[i]] = input[i]; im[rev[i]] = 0; }
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1, step = n / size;
      for (let start = 0; start < n; start += size) {
        for (let j = 0, k = 0; j < half; j++, k += step) {
          const a = start + j, b = a + half;
          const tr = re[b] * this.cos[k] - im[b] * this.sin[k];
          const ti = re[b] * this.sin[k] + im[b] * this.cos[k];
          re[b] = re[a] - tr; im[b] = im[a] - ti;
          re[a] += tr; im[a] += ti;
        }
      }
    }
    const lim = out.length;
    for (let i = 0; i < lim; i++) out[i] = Math.hypot(re[i], im[i]);
    return out;
  }
}

// ---------------------------------------------------------------------------
// Spectrum → notes → chords

/**
 * Find spectral peaks in a linear magnitude spectrum with bin width binHz.
 * Returns [{f, mag}] sorted by frequency.
 */
export function findPeaks(mags, binHz, nbhd = 2) {
  const lo = Math.max(nbhd, Math.floor(MIN_F / binHz));
  const hi = Math.min(mags.length - nbhd - 1, Math.ceil(MAX_PEAK / binHz));
  let maxMag = 0;
  for (let i = lo; i <= hi; i++) if (mags[i] > maxMag) maxMag = mags[i];
  if (maxMag <= 0) return [];
  // Noise floor: median of the band (sampled for speed).
  const sample = [];
  const stride = Math.max(1, Math.floor((hi - lo) / 400));
  for (let i = lo; i < hi; i += stride) sample.push(mags[i]);
  sample.sort((a, b) => a - b);
  const median = sample[sample.length >> 1] || 0;
  const thresh = Math.max(median * 6, maxMag * 0.035);
  const peaks = [];
  outer: for (let i = lo; i <= hi; i++) {
    const m = mags[i];
    if (m < thresh) continue;
    for (let k = 1; k <= nbhd; k++) if (m < mags[i - k] || m < mags[i + k]) continue outer;
    // Parabolic interpolation on log magnitude for sub-bin frequency.
    const a = Math.log(mags[i - 1] + 1e-12), b = Math.log(m), c = Math.log(mags[i + 1] + 1e-12);
    const denom = a - 2 * b + c;
    const delta = denom !== 0 ? (0.5 * (a - c)) / denom : 0;
    peaks.push({ f: (i + delta) * binHz, mag: m });
  }
  if (peaks.length > 40) {
    peaks.sort((x, y) => y.mag - x.mag);
    peaks.length = 40;
    peaks.sort((x, y) => x.f - y.f);
  }
  return peaks;
}

const cents = (f, ref) => 1200 * Math.log2(f / ref);

/** Group peaks into notes (fundamentals + absorbed harmonics). */
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
    if (p.mag < maxMag * 0.06) continue; // weak isolated peaks: noise or sympathetic ringing
    notes.push({ f: p.f, mag: p.mag, strength: p.mag, harmonics: 0, midi: freqToMidi(p.f) });
  }
  return notes;
}

/** Chroma vector (12) from notes, using compressed strength. */
export function chromaFromNotes(notes) {
  const chroma = new Float32Array(12);
  for (const n of notes) chroma[pcOf(n.midi)] += Math.sqrt(n.strength);
  return chroma;
}

/** Chroma straight from spectral peaks (overtones included), for overtone-aware matching. */
export function chromaFromPeaks(peaks) {
  const chroma = new Float32Array(12);
  for (const p of peaks) if (p.f < 2600) chroma[pcOf(freqToMidi(p.f))] += Math.sqrt(p.mag);
  return chroma;
}

// Overtone series as pitch-class offsets and rough weights (harmonics 1–6 of a plucked string).
const HARMONICS = [[0, 1], [0, 0.75], [7, 0.55], [0, 0.4], [4, 0.3], [7, 0.25]];
const norm12 = (v) => { let s = 0; for (let i = 0; i < 12; i++) s += v[i] * v[i]; return Math.sqrt(s); };

const TEMPLATES = [];
for (let root = 0; root < 12; root++) {
  for (const q of QUALITY_KEYS) {
    const v = new Float32Array(12); // which notes are in the chord
    const h = new Float32Array(12); // what the spectrum should look like, overtones included
    for (const iv of QUALITIES[q].ints) {
      const p = (root + iv.semi) % 12;
      v[p] = iv.semi === 0 ? 1.1 : 1;
      for (const [off, w] of HARMONICS) h[(p + off) % 12] += w;
    }
    TEMPLATES.push({ root, q, v, norm: norm12(v), h, hnorm: norm12(h), complexity: QUALITIES[q].complexity });
  }
}

/**
 * Rank chords. `chroma` comes from grouped notes (fundamentals), `raw` (optional) straight from
 * spectral peaks; `mix` blends note matching (0) with overtone-aware template matching (1).
 * Returns [{root, q, score}] best first.
 */
export function rankChords(chroma, bassPc, raw = null, mix = 0) {
  const cnorm = norm12(chroma);
  if (cnorm === 0) return [];
  let cmax = 0, rmax = 0;
  for (let i = 0; i < 12; i++) { cmax = Math.max(cmax, chroma[i]); if (raw) rmax = Math.max(rmax, raw[i]); }
  const rnorm = raw ? norm12(raw) : 0;
  const useRaw = raw && mix > 0 && rnorm > 0;
  const out = [];
  for (const t of TEMPLATES) {
    let dot = 0, missing = 0, hdot = 0, rmissing = 0;
    for (let i = 0; i < 12; i++) {
      dot += chroma[i] * t.v[i];
      if (t.v[i] > 0 && chroma[i] < cmax * 0.12) missing++;
      if (useRaw) {
        hdot += raw[i] * t.h[i];
        if (t.v[i] > 0 && raw[i] < rmax * 0.12) rmissing++;
      }
    }
    let score = dot / (cnorm * t.norm);
    let miss = missing;
    if (useRaw) {
      score = (1 - mix) * score + mix * (hdot / (rnorm * t.hnorm));
      miss = (1 - mix) * missing + mix * rmissing;
    }
    score -= 0.035 * t.complexity + 0.08 * miss;
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
  const x0 = d[tau - 1], x1 = d[tau], x2 = tau + 1 <= tauMax ? d[tau + 1] : x1;
  const denom = x0 - 2 * x1 + x2;
  const shift = denom !== 0 ? (0.5 * (x0 - x2)) / denom : 0;
  return { f: sampleRate / (tau + shift), clarity: 1 - x1 };
}

// ---------------------------------------------------------------------------
// Analyzer: stateful, frame by frame

const rmsOf = (buf, from, to) => {
  let s = 0;
  for (let i = from; i < to; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / Math.max(1, to - from));
};

export class Analyzer {
  /** @param {number} sampleRate @param {Partial<typeof DEFAULTS>} opts */
  constructor(sampleRate, opts = {}) {
    this.sr = sampleRate;
    this.o = { ...DEFAULTS, ...opts };
    // Window sizes are specified for 48 kHz; scale for other rates, keep powers of two for the FFT.
    const scale = sampleRate / 48000;
    this.win = Math.round(this.o.win * scale);
    this.minWin = Math.round(this.o.minWin * scale);
    this.fftN = 1 << Math.ceil(Math.log2(Math.max(this.o.pad * scale, this.win)));
    this.fft = new FFT(this.fftN);
    this.frameBuf = new Float64Array(this.fftN);
    this.mags = new Float64Array(this.fftN / 2);
    this.blackman = new Map();
    this.smooth = new Float32Array(12);
    this.rawSmooth = new Float32Array(12);
    this.candidate = null;
    this.candidateFrames = 0;
    this.stableChord = null;
    this.stableMode = null;
    this.bassCandidate = null;
    this.bassFrames = 0;
    this.noiseRms = 0.002;
    this.lastOnset = -1;
    // Short FFT for spectral-flux onset detection.
    this.fluxN = 1 << Math.round(Math.log2(2048 * (sampleRate / 48000)));
    this.fluxFFT = new FFT(this.fluxN);
    this.fluxBuf = new Float64Array(this.fluxN);
    this.fluxMag = new Float64Array(this.fluxN / 2);
    this.fluxPrev = null;
    this.fluxHist = [];
    this.fluxHann = new Float64Array(this.fluxN).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (this.fluxN - 1)));
    this.onsets = [];
    this.lastT = null;
  }

  /** Samples needed in each buffer passed to process(). */
  get bufferSize() {
    return Math.max(this.win, 4096 + 960 * 2, Math.round(this.sr * 0.2));
  }

  windowFor(len) {
    let w = this.blackman.get(len);
    if (!w) {
      w = new Float64Array(len);
      for (let i = 0; i < len; i++) {
        const x = (2 * Math.PI * i) / (len - 1);
        w[i] = 0.42 - 0.5 * Math.cos(x) + 0.08 * Math.cos(2 * x);
      }
      this.blackman.set(len, w);
    }
    return w;
  }

  /**
   * Analyse the most recent audio. `buf` holds the latest samples (newest last), `t` is the
   * time in seconds of the last sample. Returns a frame object (see end of method).
   */
  process(buf, t) {
    const n = buf.length;
    const sr = this.sr;
    const dt = this.lastT == null ? 0.02 : Math.max(0.005, t - this.lastT);
    this.lastT = t;

    // --- level, gate, onset
    const recent = buf.subarray(n - 4096);
    const rms = rmsOf(recent, 0, recent.length);
    if (rms < this.noiseRms * 2) this.noiseRms = 0.98 * this.noiseRms + 0.02 * rms;
    const gate = Math.max(0.004, this.noiseRms * 3);
    const silent = rms < gate;
    const level = Math.min(1, Math.max(0, (20 * Math.log10(rms + 1e-9) + 60) / 54));

    // Onset (strum) detection: spectral flux = summed increase of log magnitude across the
    // spectrum since the last frame. Catches a new strum even when the overall volume is flat.
    const hop = Math.min(Math.round(dt * sr), Math.round(sr * 0.05));
    let onset = false;
    {
      const fn = this.fluxN, fb = this.fluxBuf;
      for (let i = 0; i < fn; i++) fb[i] = buf[n - fn + i] * this.fluxHann[i];
      const mag = this.fluxFFT.magnitudes(fb, this.fluxMag);
      const lo = Math.floor(70 / (sr / fn)), hi = Math.min(mag.length - 1, Math.ceil(5000 / (sr / fn)));
      // Noise floor (median bin): bins near it count as zero, so hiss doesn't create flux.
      const smp = [];
      for (let i = lo; i <= hi; i += 4) smp.push(mag[i]);
      smp.sort((x, y) => x - y);
      const floor = (smp[smp.length >> 1] || 1e-9) * this.o.fluxFloor;
      let flux = 0, total = 0;
      const prev = this.fluxPrev;
      for (let i = lo; i <= hi; i++) {
        const l = this.o.fluxFloor > 0 ? (mag[i] > floor ? Math.log(mag[i] / floor) : 0) : Math.log1p(1000 * mag[i]);
        if (prev) { const d = l - prev[i]; if (d > 0) flux += d; }
        total += l;
        mag[i] = l;
      }
      if (!prev) this.fluxPrev = new Float64Array(mag.length);
      this.fluxPrev.set(mag);
      // Relative to overall spectral level, so loud and quiet playing behave alike.
      const rel = total > 0 ? flux / total : 0;
      const hist = this.fluxHist;
      const sorted = hist.slice().sort((a, b) => a - b);
      const med = sorted.length ? sorted[sorted.length >> 1] : 0;
      if (!silent && rel > Math.max(this.o.fluxAbs, med * this.o.fluxMed) && t - this.lastOnset > 0.1 && prev) {
        // Locate the attack inside the newest audio: the 5 ms block with the biggest energy jump.
        const blk = Math.round(sr * 0.005);
        const from = Math.max(blk, n - hop - Math.round(fn / 2));
        let at = n - hop, bestRatio = 0;
        for (let i = from; i + blk <= n; i += blk) {
          const r = rmsOf(buf, i, i + blk) / (rmsOf(buf, i - blk, i) + 1e-6);
          if (r > bestRatio) { bestRatio = r; at = i; }
        }
        const onsetT = t - (n - at) / sr;
        this.lastOnset = onsetT;
        // Remember what was sounding before this strum, to discount its ringing tail.
        this.tailPcs = this.stableMode === "chord" && this.stableChord ? this.stableChord.pcs : null;
        this.onsets.push(onsetT);
        if (this.onsets.length > 24) this.onsets.shift();
        onset = true;
      }
      hist.push(rel);
      if (hist.length > 40) hist.shift();
    }

    const base = { t, level, silent, onset, bpm: this.tempo(t), stableChord: this.stableChord, stableMode: this.stableMode };

    if (silent) {
      for (let i = 0; i < 12; i++) this.smooth[i] *= 0.8;
      this.candidateFrames = 0;
      return { ...base, notes: [], chroma: this.smooth, activePcs: [], pitch: null, chord: null, alternatives: [] };
    }

    // --- spectrum
    const sinceOnset = Math.round((t - this.lastOnset) * sr);
    let len = this.win;
    const fresh = this.o.trimOnset && this.lastOnset >= 0 && sinceOnset < this.win;
    if (fresh) len = Math.max(this.minWin, sinceOnset);
    len = Math.min(len, n);
    const w = this.windowFor(len);
    const fb = this.frameBuf;
    fb.fill(0);
    for (let i = 0; i < len; i++) fb[i] = buf[n - len + i] * w[i];
    this.fft.magnitudes(fb, this.mags);
    const binHz = sr / this.fftN;
    // Neighbourhood for local maxima ≈ the Blackman main-lobe half width in padded bins.
    const nbhd = Math.max(2, Math.round((3 * this.fftN) / len / 2));
    const peaks = findPeaks(this.mags, binHz, nbhd);
    const notes = groupHarmonics(peaks);
    const chroma = chromaFromNotes(notes);

    let cmax = 0;
    for (let i = 0; i < 12; i++) cmax = Math.max(cmax, chroma[i]);
    // After a strum, forget the previous chord at once.
    const keep = onset ? 0 : this.o.smooth;
    for (let i = 0; i < 12; i++) this.smooth[i] = keep * this.smooth[i] + (1 - keep) * (cmax ? chroma[i] / cmax : 0);
    const raw = chromaFromPeaks(peaks);
    let rmax = 0;
    for (let i = 0; i < 12; i++) rmax = Math.max(rmax, raw[i]);
    for (let i = 0; i < 12; i++) this.rawSmooth[i] = keep * this.rawSmooth[i] + (1 - keep) * (rmax ? raw[i] / rmax : 0);

    let smax = 0;
    for (let i = 0; i < 12; i++) smax = Math.max(smax, this.smooth[i]);
    const activePcs = [];
    for (let i = 0; i < 12; i++) if (this.smooth[i] > smax * 0.3) activePcs.push(i);

    // YIN is the most expensive step; only needed when one or two notes ring.
    let pitch = null;
    if (activePcs.length <= 2) {
      const p = yin(recent, sr);
      if (p && p.clarity > 0.8) pitch = { ...p, midi: freqToMidi(p.f) };
    }

    const bass = notes.find((nt) => nt.strength > (notes[0]?.strength || 0) * 0.25 && this.smooth[pcOf(nt.midi)] > smax * 0.3);
    const bassPc = bass ? pcOf(bass.midi) : null;

    let chord = null, alternatives = [], score = 0;
    if (activePcs.length >= 2) {
      let rankChroma = this.smooth, rankRaw = this.rawSmooth;
      if (this.tailPcs && t - this.lastOnset < this.o.tailSec) {
        // Scale-invariant matching means re-strumming the same chord is unaffected, while
        // notes left over from a different previous chord stop pulling the result.
        rankChroma = Float32Array.from(this.smooth);
        rankRaw = Float32Array.from(this.rawSmooth);
        for (const p of this.tailPcs) { rankChroma[p] *= this.o.tailWeight; rankRaw[p] *= this.o.tailWeight; }
      }
      const ranked = rankChords(rankChroma, bassPc, rankRaw, this.o.harmMix);
      let best = ranked[0];
      // Hysteresis: keep the displayed chord while it is nearly as good as the best match.
      // Stops Cmaj7 ↔ C style flicker when a quiet 7th comes and goes.
      const st = this.stableMode === "chord" ? this.stableChord : null;
      const margin = t - this.lastOnset < 0.3 ? this.o.stickyOnset : this.o.sticky;
      if (st && best && (best.root !== st.rootPc || best.q !== st.quality)) {
        const cur = ranked.find((r) => r.root === st.rootPc && r.q === st.quality);
        if (cur && cur.score > this.o.scoreMin && cur.score >= best.score - margin) best = cur;
      }
      if (best && best.score > this.o.scoreMin) {
        score = best.score;
        chord = makeChord(best.root, best.q, bassPc);
        alternatives = ranked.filter((r) => r !== best && r.score > best.score - 0.12).slice(0, 3).map((r) => makeChord(r.root, r.q));
      }
    }

    // Debounce: a chord must win a few frames in a row before it is shown (fewer after a strum).
    // The slash (bass) part is tracked separately so G ↔ G/B does not count as a chord change.
    const key = chord ? chordKey(chord) : activePcs.length === 1 ? "note" : "";
    if (key === this.candidate) this.candidateFrames++;
    else { this.candidate = key; this.candidateFrames = 1; }
    const slashKey = chord ? chord.slash || "" : null;
    if (slashKey === this.bassCandidate) this.bassFrames++;
    else { this.bassCandidate = slashKey; this.bassFrames = 1; }
    let need = t - this.lastOnset < 0.3 ? this.o.onsetCommitFrames : this.o.commitFrames;
    // A strum reaches the low strings first and briefly looks like a power chord.
    if (chord && chord.quality === "5" && t - this.lastOnset < 0.3) need += this.o.powerExtra;
    if (chord && this.candidateFrames >= need) {
      const same = this.stableMode === "chord" && this.stableChord && chordKey(this.stableChord) === key;
      if (!same) this.stableChord = chord;
      else if ((this.stableChord.slash || "") !== slashKey && this.bassFrames >= this.o.slashFrames) this.stableChord = chord;
      this.stableMode = "chord";
    }
    if (key === "note" && this.candidateFrames >= need) this.stableMode = "note";

    return {
      ...base, notes, chroma: this.smooth, activePcs, bassPc, chord, score, alternatives, pitch, peaks,
      stableChord: this.stableChord, stableMode: this.stableMode,
    };
  }

  /** Strum tempo in BPM from recent onset intervals, folded into 60–180. Null if unclear. */
  tempo(t) {
    const on = this.onsets.filter((x) => t - x < 8);
    if (on.length < 5) return null;
    const iois = [];
    for (let i = 1; i < on.length; i++) {
      const d = on[i] - on[i - 1];
      if (d > 0.15 && d < 2) iois.push(d);
    }
    if (iois.length < 4) return null;
    iois.sort((a, b) => a - b);
    const med = iois[iois.length >> 1];
    // Reject very irregular playing: most intervals should be near a multiple of the median.
    const regular = iois.filter((d) => { const r = d / med; return Math.abs(r - Math.round(r)) < 0.18; }).length;
    if (regular < iois.length * 0.7) return null;
    let bpm = 60 / med;
    while (bpm < 60) bpm *= 2;
    while (bpm > 180) bpm /= 2;
    return Math.round(bpm);
  }
}

// ---------------------------------------------------------------------------
// Listener: Web Audio wrapper around Analyzer

export class Listener {
  constructor(onFrame, opts = {}) {
    this.onFrame = onFrame;
    this.opts = opts;
    this.running = false;
  }

  /** Change analysis options while running (e.g. Fast/Steady response). */
  setOptions(opts) {
    this.opts = opts;
    if (this.analyzer) Object.assign(this.analyzer.o, opts);
  }

  async start() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive" });
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.analyzer = new Analyzer(this.ctx.sampleRate, this.opts);
    // The AnalyserNode is only used as a ring buffer of the latest samples.
    this.node = this.ctx.createAnalyser();
    this.node.fftSize = 1 << Math.ceil(Math.log2(this.analyzer.bufferSize));
    this.source.connect(this.node);
    this.buf = new Float32Array(this.node.fftSize);
    this.running = true;
    this.timer = setInterval(() => this.tick(), 20);
  }

  stop() {
    this.running = false;
    clearInterval(this.timer);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close();
  }

  tick() {
    this.node.getFloatTimeDomainData(this.buf);
    const t0 = performance.now();
    const frame = this.analyzer.process(this.buf, this.ctx.currentTime);
    frame.costMs = performance.now() - t0;
    this.onFrame(frame);
  }
}
