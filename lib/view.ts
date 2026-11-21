/**
 * Server-side view layer for the interface: loads the data once per change on disk,
 * turns postings into light job cards, applies URL filters and computes market insights.
 */
import { CATEGORY_META } from "@/lib/categories";
import { statSync } from "node:fs";
import path from "node:path";
import { loadClassifiedJobs, loadSources, tally, tallyKey, loadRun } from "./data";
import { COMPANIES } from "./sources/ats";
import { byNewest, compareFit, resolveSort, type Sort } from "./sort";
import { CATEGORIES, type Category, type ClassifiedJob, type Extraction } from "./types";

export { compareFit, fitRank, resolveSort, SORT_LABEL, SORTS, type Sort } from "./sort";

/** Directions with fewer postings than this are an "early signal": shown as lists, not charts. */
export const EARLY_SIGNAL_THRESHOLD = 15;
export const isEarlySignal = (postings: number) => postings < EARLY_SIGNAL_THRESHOLD;


/**
 * Can a graduate realistically apply?
 * - The title states a level: only intern or junior count.
 * - Otherwise the posting's level: intern or junior count.
 * - Otherwise the years asked decide: 0 to 2 years yes, more no.
 * - Nothing stated anywhere (no level, no years): yes.
 */
export function isWithinReach(j: ClassifiedJob): boolean {
  const e = j.extraction;
  const modelLevel = e?.experienceLevel ?? "unspecified";
  // A level in the title wins; the posting's own level only counts when the title says nothing.
  if (j.titleSeniority !== "unspecified") return ["intern", "junior"].includes(j.titleSeniority);
  if (["intern", "junior"].includes(modelLevel)) return true;
  const years = e?.yearsMin ?? null;
  if (years !== null) return years <= 2;
  return modelLevel === "unspecified";
}

/** Short level label for cards, in the order a reader scans them. */
export const LEVEL_LABEL: Record<string, string> = {
  intern: "Intern",
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  "staff/principal": "Staff",
  "lead/manager": "Lead",
  unspecified: "Not stated",
};

export interface JobCard {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: string;
  primary: Category;
  secondary: Category | null;
  postedAt: string | null;
  url: string;
  chips: string[];
  openToEstonia: boolean;
  withinReach: boolean;
  levelBucket: Level;
  seniority: string;
  level: string;
}

/** Level buckets for the level filter. Every job is in exactly one. */
/** Posted in the last 24 hours: gets the fresh tile. */
export const isNewPosting = (iso: string | null, now = Date.now()) => !!iso && now - new Date(iso).getTime() < 86_400_000;

export const LEVELS = ["reach", "mid", "senior"] as const;
export type Level = (typeof LEVELS)[number];

export interface Filters {
  /** The one selected direction, or "" for none or several (see categories). */
  category: Category | "";
  /** Selected directions; empty means all. Several come from email links (?category=product,game). */
  categories: Category[];
  estonia: boolean;
  remote: "" | "remote" | "hybrid" | "onsite";
  /** Selected level buckets; empty means all levels. */
  levels: Level[];
  /** Sort order from the URL; Best fit first when none is given. */
  sort: Sort;
  /** Free-text search over title, company, location, top requirements and direction. */
  q: string;
}

/**
 * Level bucket of a job:
 * - "reach": within reach (see isWithinReach),
 * - "mid": mid-level, or no level stated and 3 to 4 years asked,
 * - "senior": senior, staff, lead or manager, or no level stated and 5+ years asked.
 */
export function levelBucket(j: ClassifiedJob): Level {
  if (isWithinReach(j)) return "reach";
  if (j.seniority === "mid") return "mid";
  if (j.seniority === "unspecified") return (j.extraction?.yearsMin ?? 0) >= 5 ? "senior" : "mid";
  return "senior";
}

/**
 * Level text on a card. When the level is only the model's guess and the posting asks for
 * 0 to 2 years (so it is within reach), the years are the honest label, not "Mid".
 */
function cardLevel(j: ClassifiedJob): string {
  const e = j.extraction;
  const guessed = j.titleSeniority === "unspecified" && !["intern", "junior", "unspecified"].includes(j.seniority);
  if (guessed && isWithinReach(j) && typeof e?.yearsMin === "number" && e.yearsMin <= 2) return "0 to 2 yrs";
  return LEVEL_LABEL[j.seniority] ?? j.seniority;
}

/** Some boards list 100+ countries in the location; collapse long lists so cards stay readable. */
export function shortLocation(loc: string): string {
  const parts = loc.split(" · ").map((part) => {
    const m = part.match(/^(.*?)\((.*)\)\s*$/);
    if (!m || m[2].length < 60) return part.trim();
    const n = m[2].split(/,\s*(?=[A-ZÅÉ])/).length;
    return `${m[1].trim()} (${n} countries${/Estonia/.test(m[2]) ? " incl. Estonia" : ""})`;
  });
  const uniq = [...new Set(parts)];
  return uniq.length > 3 ? `${uniq.slice(0, 3).join(", ")} +${uniq.length - 3} more` : uniq.join(", ");
}

/** One name per tool: "Adobe Photoshop" and "Photoshop" count as the same thing. */
export function canonicalTool(t: string): string {
  const s = t.trim();
  if (/^adobe\s+(creative\s+(suite|cloud)|cc)$/i.test(s) || /^adobe$/i.test(s)) return "Adobe Creative Suite";
  const bare = s.replace(/^adobe\s+/i, "");
  return bare.length ? bare : s;
}
const tools = (list: string[]) => [...new Set(list.map(canonicalTool))];

function toCard(j: ClassifiedJob): JobCard {
  const e = j.extraction;
  const chips = e ? [...new Set([...e.skills.slice(0, 3), ...tools(e.tools).slice(0, 2)])] : [];
  return {
    id: j.id,
    title: j.title,
    company: j.company,
    location: shortLocation(j.location),
    remote: j.remote,
    primary: j.primary!,
    secondary: j.secondary,
    postedAt: j.postedAt,
    url: j.url,
    chips,
    openToEstonia: j.openToEstonia === true,
    withinReach: isWithinReach(j),
    levelBucket: levelBucket(j),
    seniority: j.seniority,
    level: cardLevel(j),
  };
}

interface Dataset {
  jobs: ClassifiedJob[];
  cards: JobCard[];
  updatedAt: string | null;
  /** The last finished daily refresh and the next scheduled one (data/run.json), if recorded. */
  lastRun: string | null;
  nextRun: string | null;
  boards: number;
  companyFeeds: number;
}

let cache: { key: string; data: Dataset } | null = null;

/** Design roles with a category, newest first. Re-read only when the data files change. */
export function getDataset(): Dataset {
  const dir = path.join(process.cwd(), "data");
  const key = ["jobs.json", "classifications.json", "extractions.json", "run.json"]
    .map((f) => {
      try {
        return statSync(path.join(dir, f)).mtimeMs;
      } catch {
        return 0;
      }
    })
    .join("|");
  if (cache?.key === key) return cache.data;

  // Cards (and jobs, in step) in the default order: Best fit first (fitRank), newest first inside each group.
  const ranked = loadClassifiedJobs()
    .filter((j) => j.primary)
    .map((j) => ({ j, c: toCard(j) }))
    .sort((a, b) => compareFit(a.c, b.c));
  const jobs = ranked.map((r) => r.j);
  const sources = loadSources();
  const run = loadRun();
  const data: Dataset = {
    jobs,
    cards: ranked.map((r) => r.c),
    updatedAt: sources?.fetchedAt ?? null,
    lastRun: run?.lastRun ?? sources?.fetchedAt ?? null,
    nextRun: run?.nextRun ?? null,
    boards: sources?.sources.filter((s) => s.sourceType === "board" && s.ok).length ?? 0,
    companyFeeds: COMPANIES.length,
  };
  cache = { key, data };
  return data;
}

export function parseFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const picked = new Set(one("category").split(","));
  const categories = CATEGORIES.filter((c) => picked.has(c));
  const category = categories.length === 1 ? categories[0] : "";
  const remote = ["remote", "hybrid", "onsite"].includes(one("remote")) ? (one("remote") as Filters["remote"]) : "";
  // ?level=reach,mid; the old ?reach=1 still means "within reach".
  const levels = new Set(one("level").split(",").filter((l): l is Level => (LEVELS as readonly string[]).includes(l)));
  if (one("reach") === "1") levels.add("reach");
  const list = LEVELS.filter((l) => levels.has(l));
  const q = one("q").trim().slice(0, 80);
  return { category, categories, estonia: one("estonia") === "1", remote, levels: list, sort: resolveSort(one("sort")), q };
}


/** Text a search matches against: title, company, location, top requirements and direction name. */
const searchText = (c: JobCard) => [c.title, c.company, c.location, ...c.chips, CATEGORY_META[c.primary].short].join(" ").toLowerCase();

export function applyFilters(
  cards: JobCard[],
  f: Omit<Filters, "sort" | "q" | "categories"> & { categories?: Category[]; sort?: Sort; q?: string },
): JobCard[] {
  // Every word of the query has to appear somewhere, in any order.
  const words = (f.q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const cats = f.categories?.length ? f.categories : f.category ? [f.category] : [];
  const out = cards.filter(
    (c) =>
      (!cats.length || cats.includes(c.primary)) &&
      (!f.estonia || c.openToEstonia) &&
      (!f.remote || c.remote === f.remote) &&
      (!f.levels.length || f.levels.includes(c.levelBucket)) &&
      (!words.length || words.every((w) => searchText(c).includes(w))),
  );
  // Cards arrive Best fit first (getDataset); "newest" re-sorts by date only.
  return f.sort === "newest" ? [...out].sort(byNewest) : out;
}

/* ---------- Market insights ---------- */

/** Postings per primary category, in the fixed CATEGORIES order. */
export type Breakdown = Record<Category, number>;
const emptyBreakdown = (): Breakdown => Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Breakdown;

export interface Insight {
  postings: number;
  withRequirements: number;
  skills: { label: string; count: number; share: number; byCategory: Breakdown }[];
  tools: { label: string; count: number; share: number; byCategory: Breakdown }[];
  seniority: { label: string; count: number; byCategory: Breakdown }[];
  years: { label: string; count: number; byCategory: Breakdown }[];
  medianYears: number | null;
  statedYears: number;
  openToEstonia: number;
  withinReach: number;
}

const SENIORITY_ORDER = ["intern", "junior", "mid", "senior", "staff/principal", "lead/manager", "unspecified"];
const SENIORITY_LABEL: Record<string, string> = {
  intern: "Intern",
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  "staff/principal": "Staff",
  "lead/manager": "Lead",
  unspecified: "Not stated",
};
const YEAR_BUCKETS: { label: string; test: (y: number) => boolean }[] = [
  { label: "0-1", test: (y) => y <= 1 },
  { label: "2", test: (y) => y === 2 },
  { label: "3", test: (y) => y === 3 },
  { label: "4", test: (y) => y === 4 },
  { label: "5", test: (y) => y === 5 },
  { label: "6-7", test: (y) => y >= 6 && y <= 7 },
  { label: "8+", test: (y) => y >= 8 },
];

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

export function insightFor(jobs: ClassifiedJob[], top = 10): Insight {
  const withEx = jobs.filter((j): j is ClassifiedJob & { extraction: Extraction } => !!j.extraction);
  const ex = withEx.map((j) => j.extraction);
  const n = ex.length || 1;
  // Top items, each with its count split by the posting's primary category (same matching as tally()).
  const ranked = (pick: (e: Extraction) => string[]) =>
    tally(ex.map(pick))
      .slice(0, top)
      .map((i) => {
        const key = tallyKey(i.label);
        const byCategory = emptyBreakdown();
        for (const j of withEx) if (j.primary && pick(j.extraction).some((x) => tallyKey(x) === key)) byCategory[j.primary]++;
        return { ...i, share: Math.round((i.count / n) * 100), byCategory };
      });
  const years = ex.map((e) => e.yearsMin).filter((y): y is number => typeof y === "number");
  const bucket = (test: (j: ClassifiedJob) => boolean, from: ClassifiedJob[]) => {
    const byCategory = emptyBreakdown();
    let count = 0;
    for (const j of from) if (test(j)) {
      count++;
      if (j.primary) byCategory[j.primary]++;
    }
    return { count, byCategory };
  };
  return {
    postings: jobs.length,
    withRequirements: ex.length,
    skills: ranked((e) => e.skills),
    tools: ranked((e) => tools(e.tools)),
    seniority: SENIORITY_ORDER.map((s) => ({ label: SENIORITY_LABEL[s], ...bucket((j) => j.seniority === s, jobs) })),
    years: YEAR_BUCKETS.map((b) => ({
      label: b.label,
      ...bucket((j) => typeof j.extraction?.yearsMin === "number" && b.test(j.extraction.yearsMin), withEx),
    })),
    medianYears: median(years),
    statedYears: years.length,
    openToEstonia: jobs.filter((j) => j.openToEstonia).length,
    withinReach: jobs.filter(isWithinReach).length,
  };
}

export function categoryComparison(jobs: ClassifiedJob[]) {
  return CATEGORIES.map((c) => {
    const list = jobs.filter((j) => j.primary === c);
    const i = insightFor(list, 3);
    return {
      category: c,
      postings: list.length,
      earlySignal: isEarlySignal(list.length),
      withinReach: i.withinReach,
      openToEstonia: i.openToEstonia,
      withinReachShare: list.length ? Math.round((i.withinReach / list.length) * 100) : 0,
      medianYears: i.medianYears,
      topSkills: i.skills.map((s) => s.label),
      topTools: i.tools.map((s) => s.label),
    };
  }).sort((a, b) => b.postings - a.postings);
}

/* ---------- Shared presentation helpers ---------- */

export { formatUpdated } from "./format";

/**
 * The one fixed order of directions, used by the tab rows on Jobs and Market insights:
 * by total postings across everything, largest first (ties keep the taxonomy order).
 * Filtering never reorders it.
 */
export function directionOrder(primaries: Category[]): Category[] {
  const count = new Map<Category, number>();
  for (const p of primaries) count.set(p, (count.get(p) ?? 0) + 1);
  return [...CATEGORIES].sort((a, b) => (count.get(b) ?? 0) - (count.get(a) ?? 0));
}

const TITLE_NOISE = new Set(["a", "an", "and", "the", "to", "of", "for", "in", "at", "with", "m", "w", "d", "f", "x"]);
const titleWords = (t: string) => new Set(t.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w && !TITLE_NOISE.has(w)));
const overlap = (a: Set<string>, b: Set<string>) => {
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / (a.size + b.size - shared || 1);
};

/** A row in the jobs list: one posting, plus near-identical postings folded under it. */
export interface JobGroup {
  lead: JobCard;
  similar: JobCard[];
}

/**
 * Fold near-duplicate postings into one row: same company, same level bucket, and titles that
 * share at least 70% of their words (e.g. a company's eight "… to UX Design Career Changer
 * Apprenticeship" listings). The row sits where the first of them appears in the current order.
 */
export function groupSimilar(cards: JobCard[]): JobGroup[] {
  const groups: (JobGroup & { words: Set<string> })[] = [];
  for (const card of cards) {
    const words = titleWords(card.title);
    const home = groups.find(
      (g) => g.lead.company === card.company && g.lead.levelBucket === card.levelBucket && overlap(g.words, words) >= 0.7,
    );
    if (home) home.similar.push(card);
    else groups.push({ lead: card, similar: [], words });
  }
  return groups.map(({ lead, similar }) => ({ lead, similar }));
}
