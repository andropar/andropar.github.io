// Tiny plucked-string synth (Karplus-Strong) so you can hear any chord, interval or note.

import { midiToFreq } from "./theory.js";

let ctx = null;
const cache = new Map();

function audio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function pluckBuffer(midi) {
  if (cache.has(midi)) return cache.get(midi);
  const ac = audio();
  const sr = ac.sampleRate;
  const len = Math.floor(sr * 2.6);
  const buf = ac.createBuffer(1, len, sr);
  const out = buf.getChannelData(0);
  const period = sr / midiToFreq(midi);
  // The two-point averaging filter adds half a sample of delay.
  const N = Math.max(2, Math.round(period - 0.5));
  const line = new Float32Array(N);
  // Slightly low-passed noise burst = softer, more guitar-like attack.
  let prev = 0;
  for (let i = 0; i < line.length; i++) {
    const r = Math.random() * 2 - 1;
    prev = 0.6 * prev + 0.4 * r;
    line[i] = prev;
  }
  // Per-period loss tuned for a ~0.9 s half-life regardless of pitch.
  const decay = Math.pow(0.5, 1 / (midiToFreq(midi) * 0.9));
  let idx = 0;
  for (let i = 0; i < len; i++) {
    const a = line[idx];
    const b = line[(idx + 1) % N];
    out[i] = a;
    line[idx] = decay * 0.5 * (a + b);
    idx = (idx + 1) % N;
  }
  // Fade the tail.
  const fade = Math.floor(sr * 0.3);
  for (let i = 0; i < fade; i++) out[len - fade + i] *= 1 - i / fade;
  cache.set(midi, buf);
  return buf;
}

function playAt(midi, when, gain = 0.35) {
  const ac = audio();
  const src = ac.createBufferSource();
  src.buffer = pluckBuffer(midi);
  const g = ac.createGain();
  g.gain.value = gain;
  src.connect(g).connect(ac.destination);
  src.start(when);
}

/** Play one note. */
export function playNote(midi) {
  playAt(midi, audio().currentTime + 0.01, 0.45);
}

/** Strum notes low → high. */
export function strum(midis, spread = 0.035) {
  const ac = audio();
  const t0 = ac.currentTime + 0.02;
  const notes = midis.filter((m) => m != null).sort((a, b) => a - b);
  const g = 0.5 / Math.sqrt(notes.length || 1);
  notes.forEach((m, i) => playAt(m, t0 + i * spread, g));
}

/** Play notes one after another, then together. */
export function arpeggiate(midis, step = 0.32, thenChord = true) {
  const ac = audio();
  const t0 = ac.currentTime + 0.02;
  midis.forEach((m, i) => playAt(m, t0 + i * step, 0.4));
  if (thenChord) {
    const g = 0.45 / Math.sqrt(midis.length);
    midis.forEach((m) => playAt(m, t0 + midis.length * step + 0.15, g));
  }
}
