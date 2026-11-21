/**
 * What one subscriber's digest contains: postings first seen since their last email that match their
 * preferences, Best fit first (fitRank in lib/view.ts), at most DIGEST_CAP, plus one line of market insight from the
 * current data. Used by scripts/digest.ts; pure apart from reading the data files.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { tally } from "@/lib/data";
import { CATEGORY_META } from "@/lib/categories";
import { DIGEST_CAP, type Prefs } from "@/lib/subscription";
import { CATEGORIES, type Category } from "@/lib/types";
import { getDataset, groupSimilar, type JobCard } from "@/lib/view";

/** When Ping first saw each posting (written by scripts/stamp.ts). */
export function loadSeen(): Record<string, string> {
  const p = path.join(process.cwd(), "data", "seen.json");
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : {};
}

export const matches = (c: JobCard, p: Prefs) =>
  (!p.categories.length || p.categories.includes(c.primary)) &&
  (!p.levels.length || p.levels.includes(c.levelBucket)) &&
  (!p.estonia || c.openToEstonia) &&
  (!p.remote || c.remote === p.remote);

/** A digest row: one posting, plus how many near-identical ones it stands for (same as the Jobs list). */
export type DigestJob = JobCard & { similar: number };

export interface Digest {
  jobs: DigestJob[];
  /** All new matching postings; `jobs` shows the first DIGEST_CAP rows of them. */
  total: number;
  /** How many of all new matching postings are within reach. */
  withinReach: number;
  insight: string | null;
}

/** "Product", "Product and Game", "your 3 directions", or "all directions". */
export function directionsPhrase(categories: Category[]) {
  if (!categories.length || categories.length === CATEGORIES.length) return "all directions";
  const names = categories.map((c) => CATEGORY_META[c].short);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `your ${names.length} directions`;
}

/**
 * One line from the current data: the skill asked for most often in the subscriber's directions,
 * across postings first seen in the last 7 days (or all current postings when the week is thin).
 */
export function insightLine(prefs: Prefs, now = Date.now(), seen = loadSeen()): string | null {
  const { jobs } = getDataset();
  const inDirections = jobs.filter((j) => j.extraction && j.primary && (!prefs.categories.length || prefs.categories.includes(j.primary)));
  const weekAgo = now - 7 * 86_400_000;
  const thisWeek = inDirections.filter((j) => seen[j.id] && new Date(seen[j.id]).getTime() >= weekAgo);
  const pool = thisWeek.length >= 8 ? thisWeek : inDirections;
  if (pool.length < 3) return null;
  const top = tally(pool.map((j) => j.extraction!.skills))[0];
  if (!top) return null;
  const where = directionsPhrase(prefs.categories);
  const when = pool === thisWeek ? "this week" : "right now";
  const postings = pool === thisWeek ? "new postings" : "current postings";
  return `${top.label} is the most requested skill in ${where} ${when}: ${top.count} of ${pool.length} ${postings} ask for it.`;
}

export function buildDigest(prefs: Prefs, since: Date, now = Date.now()): Digest {
  const { cards } = getDataset();
  const seen = loadSeen();
  const t = since.getTime();
  // Cards arrive Best fit first (within reach and open to Estonia, within reach, open to Estonia, the
  // rest), newest first inside each group: the same order as the Jobs list, and the email keeps it.
  const fresh = cards.filter((c) => seen[c.id] && new Date(seen[c.id]).getTime() > t && matches(c, prefs));
  // Near-identical postings from one company fold into one row, so ten rows show ten different jobs.
  const rows = groupSimilar(fresh)
    .slice(0, DIGEST_CAP)
    .map((g) => ({ ...g.lead, similar: g.similar.length }));
  return { jobs: rows, total: fresh.length, withinReach: fresh.filter((c) => c.withinReach).length, insight: fresh.length ? insightLine(prefs, now, seen) : null };
}
