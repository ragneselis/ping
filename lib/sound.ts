/*
 * Ping's UI sound, synthesised with the Web Audio API: no audio files.
 *
 * Off by default. The choice lives in localStorage ("ping-sound"), read and written in try/catch.
 * The AudioContext is created lazily inside the first sound call, and every sound call comes from a
 * user gesture (click, hover, key), so nothing is ever created or played on page load. With sound
 * off, every call returns before touching audio at all.
 *
 * Voices (all sine, fast attack, exponential decay, master volume kept low):
 *   click   a soft "ping": about 1.3 kHz gliding slightly down, 90ms
 *   hover   a short tick, clearly audible but well under the click, at most once every 40ms
 *   row     a softer, lower tick when the pointer reaches a new job row, at most every 80ms
 *   bar     a tick on chart bars whose pitch rises with the bar's value
 *   open    a short higher note; close a short lower note
 *   chirp   two quick rising notes, for the mascots
 *   theme   two notes: rising into dark, falling into light
 *   settle  a soft low ping when a readout count-up finishes (passive)
 *   results a quiet tick when filtered results arrive (passive)
 *   eat     a small bright ping when the snake eats a tile
 * Each element nudges the pitch by a stable amount (from its label), plus a hair of randomness,
 * so repeated clicks never sound mechanical.
 */

const STORAGE_KEY = "ping-sound";
const MASTER_VOLUME = 0.24;

let enabled: boolean | null = null;
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let lastHover = 0;
let lastChirp = 0;
let lastSettle = 0;
let lastRow = 0;
const listeners = new Set<() => void>();

function readStored(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

export function isSoundOn(): boolean {
  if (typeof window === "undefined") return false;
  if (enabled === null) enabled = readStored();
  return enabled;
}

export function setSoundOn(on: boolean) {
  enabled = on;
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Private mode or blocked storage: the choice lasts for this page only.
  }
  listeners.forEach((l) => l());
}

export function subscribeSound(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The audio graph, created on first use (always inside a user gesture), or null when sound is off.
 * Passive sounds (not caused by a click: a count-up finishing, results arriving) never create it:
 * they only play once a gesture has already started audio, so nothing ever sounds on page load.
 */
function audio(passive = false): AudioContext | null {
  if (!isSoundOn()) return null;
  if (passive && (!ctx || ctx.state !== "running")) return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = MASTER_VOLUME;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** One enveloped sine note. `to` glides the pitch over the note's length. */
function tone(ac: AudioContext, { freq, to = freq, dur, gain, delay = 0 }: { freq: number; to?: number; dur: number; gain: number; delay?: number }) {
  const t = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + 0.004);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env).connect(master!);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** A stable per-element pitch factor (within about ±2.5%) plus a hair of randomness. */
function vary(seed = ""): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const stable = ((Math.abs(h) % 1000) / 1000 - 0.5) * 0.05;
  const jitter = (Math.random() - 0.5) * 0.008;
  return 1 + stable + jitter;
}

export const sound = {
  /** Start audio inside a user gesture without playing anything (e.g. starting a game), so later
   *  passive sounds in that session can play. Does nothing while sound is off. */
  unlock() {
    audio();
  },
  click(seed?: string) {
    const ac = audio();
    if (!ac) return;
    const f = 1300 * vary(seed);
    tone(ac, { freq: f, to: f * 0.86, dur: 0.09, gain: 0.5 });
  },
  /** Hover on a control: a short tick, clearly audible but well under the click (gain 0.16 vs 0.5). */
  hover(seed?: string) {
    const now = performance.now();
    if (now - lastHover < 40) return;
    const ac = audio();
    if (!ac) return;
    lastHover = now;
    const f = 2400 * vary(seed);
    tone(ac, { freq: f, to: f * 0.96, dur: 0.032, gain: 0.16 });
  },
  /** Moving onto a new job row: a softer, lower tick, at most one every 80ms. */
  row(seed?: string) {
    const now = performance.now();
    if (now - lastRow < 80) return;
    const ac = audio();
    if (!ac) return;
    lastRow = now;
    const f = 1900 * vary(seed);
    tone(ac, { freq: f, to: f * 0.97, dur: 0.028, gain: 0.1 });
  },
  /** Hover on a chart bar: a tick whose pitch rises with the bar's value (share 0 to 1). */
  bar(share: number) {
    const now = performance.now();
    if (now - lastHover < 40) return;
    const ac = audio();
    if (!ac) return;
    lastHover = now;
    const f = 1500 * (1 + 0.8 * Math.max(0, Math.min(1, share)));
    tone(ac, { freq: f, to: f * 0.98, dur: 0.04, gain: 0.15 });
  },
  open() {
    const ac = audio();
    if (!ac) return;
    tone(ac, { freq: 1560, to: 1620, dur: 0.08, gain: 0.32 });
  },
  close() {
    const ac = audio();
    if (!ac) return;
    tone(ac, { freq: 1040, to: 960, dur: 0.08, gain: 0.3 });
  },
  chirp() {
    const now = performance.now();
    if (now - lastChirp < 400) return;
    const ac = audio();
    if (!ac) return;
    lastChirp = now;
    const v = vary();
    tone(ac, { freq: 1900 * v, to: 2050 * v, dur: 0.05, gain: 0.26 });
    tone(ac, { freq: 2500 * v, to: 2700 * v, dur: 0.06, gain: 0.24, delay: 0.065 });
  },
  /** A count-up finishing: one soft, low ping (passive). */
  settle() {
    // Several figures land together: one ping for the whole band.
    const now = performance.now();
    if (now - lastSettle < 500) return;
    lastSettle = now;
    const ac = audio(true);
    if (!ac) return;
    tone(ac, { freq: 1180, to: 1080, dur: 0.11, gain: 0.28 });
  },
  /** New results after a filter or search change: a quiet tick (passive). */
  results() {
    const ac = audio(true);
    if (!ac) return;
    tone(ac, { freq: 2100, to: 2000, dur: 0.03, gain: 0.08 });
  },
  /** The snake eats a tile: a small, bright ping. */
  eat() {
    const ac = audio(true);
    if (!ac) return;
    const f = 1650 * vary();
    tone(ac, { freq: f, to: f * 1.08, dur: 0.06, gain: 0.3 });
  },
  theme(toDark: boolean) {
    const ac = audio();
    if (!ac) return;
    const [a, b] = toDark ? [880, 1175] : [1175, 880];
    tone(ac, { freq: a, dur: 0.07, gain: 0.32 });
    tone(ac, { freq: b, dur: 0.09, gain: 0.32, delay: 0.075 });
  },
};
