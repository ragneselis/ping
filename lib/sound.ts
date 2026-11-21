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
 *   hover   a barely audible tick: high, 25ms, very quiet, at most once every 40ms
 *   open    a short higher note; close a short lower note
 *   chirp   two quick rising notes, for the mascots
 *   theme   two notes: rising into dark, falling into light
 * Each element nudges the pitch by a stable amount (from its label), plus a hair of randomness,
 * so repeated clicks never sound mechanical.
 */

const STORAGE_KEY = "ping-sound";
const MASTER_VOLUME = 0.16;

let enabled: boolean | null = null;
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let lastHover = 0;
let lastChirp = 0;
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

/** The audio graph, created on first use (always inside a user gesture), or null when sound is off. */
function audio(): AudioContext | null {
  if (!isSoundOn()) return null;
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
  click(seed?: string) {
    const ac = audio();
    if (!ac) return;
    const f = 1300 * vary(seed);
    tone(ac, { freq: f, to: f * 0.86, dur: 0.09, gain: 0.5 });
  },
  hover(seed?: string) {
    const now = performance.now();
    if (now - lastHover < 40) return;
    const ac = audio();
    if (!ac) return;
    lastHover = now;
    const f = 2600 * vary(seed);
    tone(ac, { freq: f, to: f * 0.97, dur: 0.025, gain: 0.05 });
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
  theme(toDark: boolean) {
    const ac = audio();
    if (!ac) return;
    const [a, b] = toDark ? [880, 1175] : [1175, 880];
    tone(ac, { freq: a, dur: 0.07, gain: 0.32 });
    tone(ac, { freq: b, dur: 0.09, gain: 0.32, delay: 0.075 });
  },
};
