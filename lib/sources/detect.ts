/**
 * Which applicant tracking system a careers page uses, and whether its public board can be read.
 * Shared by the weekly discovery (scripts/discover.ts) and by hand checks (npm run detect -- <url>).
 *
 * 1. Patterns: the careers URL itself, then the page's HTML (links, iframes, embed scripts) is
 *    searched for the public board addresses of the eight supported systems.
 * 2. Teamtailor careers sites on their own domain only show "teamtailor" in their assets; then the
 *    page's host is the slug.
 * 3. A match counts only when the real fetcher (lib/sources/ats.ts) reads the board without an error.
 *    An empty board is fine: it is still readable.
 * 4. Many careers pages load their list with JavaScript, so nothing shows in the HTML. Then likely
 *    slugs from the company name are tried on every system, and a guessed board only counts when at
 *    least one of its roles is located in Estonia (so a namesake company elsewhere is never added).
 */
import { getText } from "../http";
import { ATS, companySlug, type Ats } from "../company";
import type { RawPosting } from "../types";
import { FETCHERS } from "./ats";

export interface Board {
  ats: Ats;
  slug: string;
  eu?: boolean;
}

const PATTERNS: { ats: Ats; re: RegExp; eu?: (m: RegExpMatchArray) => boolean }[] = [
  { ats: "greenhouse", re: /(?:job-boards|boards)(?:\.eu)?\.greenhouse\.io\/(?:embed\/job_board(?:\/js)?\?for=)?([a-z0-9_-]+)/i },
  { ats: "greenhouse", re: /boards-api\.greenhouse\.io\/v1\/boards\/([a-z0-9_-]+)/i },
  { ats: "lever", re: /jobs\.(eu\.)?lever\.co\/([a-z0-9_.-]+)/i, eu: (m) => !!m[1] },
  { ats: "lever", re: /api\.(eu\.)?lever\.co\/v0\/postings\/([a-z0-9_.-]+)/i, eu: (m) => !!m[1] },
  { ats: "ashby", re: /jobs\.ashbyhq\.com\/([a-z0-9_.%-]+)/i },
  { ats: "ashby", re: /api\.ashbyhq\.com\/posting-api\/job-board\/([a-z0-9_.%-]+)/i },
  { ats: "teamtailor", re: /([a-z0-9-]+)\.teamtailor\.com/i },
  { ats: "workable", re: /apply\.workable\.com\/(?:api\/v1\/widget\/accounts\/)?([a-z0-9_-]+)/i },
  { ats: "workable", re: /([a-z0-9-]+)\.workable\.com/i },
  { ats: "recruitee", re: /([a-z0-9-]+)\.recruitee\.com/i },
  { ats: "smartrecruiters", re: /(?:careers|jobs)\.smartrecruiters\.com\/([a-z0-9_-]+)/i },
  { ats: "smartrecruiters", re: /api\.smartrecruiters\.com\/v1\/companies\/([a-z0-9_-]+)/i },
  { ats: "personio", re: /([a-z0-9-]+)\.jobs\.personio\.(?:de|com)/i },
];

/** Slugs that are parts of the systems themselves, not a company's board. */
const NOT_A_SLUG = new Set(["www", "app", "api", "cdn", "assets", "static", "embed", "js", "css", "images", "career", "careers", "jobs", "apply", "widget", "v1", "help", "support", "blog"]);

function groupOf(ats: Ats, m: RegExpMatchArray): string {
  return ats === "lever" ? m[2] : m[1];
}

/** Every board address mentioned in a text, in order of appearance, without duplicates. */
export function boardsIn(text: string): Board[] {
  const out: Board[] = [];
  for (const p of PATTERNS) {
    for (const m of text.matchAll(new RegExp(p.re, "gi"))) {
      const slug = decodeURIComponent(groupOf(p.ats, m)).replace(/[./]+$/, "");
      if (!slug || NOT_A_SLUG.has(slug.toLowerCase())) continue;
      const b: Board = { ats: p.ats, slug, ...(p.eu?.(m) ? { eu: true } : {}) };
      if (!out.some((o) => o.ats === b.ats && o.slug.toLowerCase() === b.slug.toLowerCase())) out.push(b);
    }
  }
  return out;
}

/** Can the real fetcher read this board? Returns its open roles, or the error. */
export async function readBoard(b: Board): Promise<{ ok: true; roles: number; postings: RawPosting[] } | { ok: false; error: string }> {
  try {
    const postings = await FETCHERS[b.ats]("check", b.slug, b.eu);
    return { ok: true, roles: postings.length, postings };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}

export type Detection =
  | { ok: true; board: Board; roles: number; via: string }
  | { ok: false; reason: string };

const IN_ESTONIA = /\b(estonia|eesti|tallinn|tartu)\b/i;

/** Slugs a company's board is likely to use: "Bob W" -> bobw, bob-w; "Fusebox Games" -> fuseboxgames, fusebox-games, fusebox. */
export function slugGuesses(name: string): string[] {
  const dashed = companySlug(name);
  const words = dashed.split("-").filter(Boolean);
  return [...new Set([dashed.replace(/-/g, ""), dashed, words[0]].filter((s) => s && s.length >= 3))];
}

/** Try likely slugs on every system; keep the first readable board with a role located in Estonia. */
async function guessBoard(name: string): Promise<{ b: Board; roles: number } | null> {
  for (const slug of slugGuesses(name)) {
    for (const ats of ATS) {
      if (ats === "smartrecruiters") continue; // its API answers every slug, even unknown ones
      const r = await readBoard({ ats, slug });
      if (r.ok && r.postings.some((p) => IN_ESTONIA.test([p.location, ...(p.regionHints ?? [])].join(" ")))) return { b: { ats, slug }, roles: r.roles };
    }
  }
  return null;
}

/** Find the board behind a careers page and confirm it can be read. `name` enables the slug guesses (step 4). */
export async function detectBoard(careersUrl: string, name?: string): Promise<Detection> {
  const found = await detectFromPage(careersUrl);
  if (found.ok || !name) return found;
  const guess = await guessBoard(name);
  return guess ? { ok: true, board: guess.b, roles: guess.roles, via: "board name guessed, roles in Estonia" } : found;
}

async function detectFromPage(careersUrl: string): Promise<Detection> {
  const candidates: { b: Board; via: string }[] = boardsIn(careersUrl).map((b) => ({ b, via: "careers URL" }));
  let html = "";
  try {
    html = await getText(careersUrl, 20000);
  } catch (e: any) {
    if (!candidates.length) return { ok: false, reason: `careers page could not be loaded (${String(e?.message ?? e).slice(0, 80)})` };
  }
  for (const b of boardsIn(html)) if (!candidates.some((c) => c.b.ats === b.ats && c.b.slug === b.slug)) candidates.push({ b, via: "careers page" });
  // A Teamtailor site on the company's own domain: the host is the slug.
  if (/teamtailor/i.test(html) && !candidates.some((c) => c.b.ats === "teamtailor")) {
    candidates.push({ b: { ats: "teamtailor", slug: new URL(careersUrl).host }, via: "Teamtailor site on its own domain" });
  }
  if (!candidates.length) return { ok: false, reason: html ? "no supported job system found on the careers page" : "careers page could not be loaded" };
  const errors: string[] = [];
  for (const c of candidates.slice(0, 4)) {
    const r = await readBoard(c.b);
    if (r.ok) return { ok: true, board: c.b, roles: r.roles, via: c.via };
    errors.push(`${c.b.ats}/${c.b.slug}: ${r.error.slice(0, 60)}`);
  }
  return { ok: false, reason: `board found but not readable (${errors.join("; ")})` };
}
