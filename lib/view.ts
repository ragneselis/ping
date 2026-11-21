/**
 * Server-side view layer for the interface: loads the data once per change on disk,
 * turns postings into light job cards, applies URL filters and computes market insights.
 */
import { CATEGORY_META } from "@/lib/categories";
import { statSync } from "node:fs";
import path from "node:path";
import { loadClassifiedJobs, loadSources, tally, tallyKey } from "./data";
import { COMPANIES } from "./sources/ats";
import { CATEGORIES, type Category, type ClassifiedJob, type Extraction } from "./types";

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
export type Sort = "reach" | "newest";

export interface Filters {
  category: Category | "";
  estonia: boolean;
  remote: "" | "remote" | "hybrid" | "onsite";
  /** Selected level buckets; empty means all levels. */
  levels: Level[];
  /** Sort order: explicit from the URL, or the default for the chosen levels. */
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
  boards: number;
  companyFeeds: number;
}

let cache: { key: string; data: Dataset } | null = null;

/** Design roles with a category, newest first. Re-read only when the data files change. */
export function getDataset(): Dataset {
  const dir = path.join(process.cwd(), "data");
  const key = ["jobs.json", "classifications.json", "extractions.json"]
    .map((f) => {
      try {
        return statSync(path.join(dir, f)).mtimeMs;
      } catch {
        return 0;
      }
    })
    .join("|");
  if (cache?.key === key) return cache.data;

  // Within-reach jobs first (graduates see what they can apply for), then newest first.
  const jobs = loadClassifiedJobs()
    .filter((j) => j.primary)
    .sort((a, b) => Number(isWithinReach(b)) - Number(isWithinReach(a)) || (b.postedAt ?? "").localeCompare(a.postedAt ?? ""));
  const sources = loadSources();
  const data: Dataset = {
    jobs,
    cards: jobs.map(toCard),
    updatedAt: sources?.fetchedAt ?? null,
    boards: sources?.sources.filter((s) => s.sourceType === "board" && s.ok).length ?? 0,
    companyFeeds: COMPANIES.length,
  };
  cache = { key, data };
  return data;
}

export function parseFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const category = (CATEGORIES as readonly string[]).includes(one("category")) ? (one("category") as Category) : "";
  const remote = ["remote", "hybrid", "onsite"].includes(one("remote")) ? (one("remote") as Filters["remote"]) : "";
  // ?level=reach,mid; the old ?reach=1 still means "within reach".
  const levels = new Set(one("level").split(",").filter((l): l is Level => (LEVELS as readonly string[]).includes(l)));
  if (one("reach") === "1") levels.add("reach");
  const list = LEVELS.filter((l) => levels.has(l));
  const q = one("q").trim().slice(0, 80);
  return { category, estonia: one("estonia") === "1", remote, levels: list, sort: resolveSort(one("sort"), list), q };
}

/** Default sort: within reach first, unless the level filter leaves within-reach jobs out. */
export function resolveSort(raw: string, levels: Level[]): Sort {
  if (raw === "reach" || raw === "newest") return raw;
  return levels.length && !levels.includes("reach") ? "newest" : "reach";
}

/** Text a search matches against: title, company, location, top requirements and direction name. */
const searchText = (c: JobCard) => [c.title, c.company, c.location, ...c.chips, CATEGORY_META[c.primary].short].join(" ").toLowerCase();

export function applyFilters(cards: JobCard[], f: Omit<Filters, "sort" | "q"> & { sort?: Sort; q?: string }): JobCard[] {
  // Every word of the query has to appear somewhere, in any order.
  const words = (f.q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const out = cards.filter(
    (c) =>
      (!f.category || c.primary === f.category) &&
      (!f.estonia || c.openToEstonia) &&
      (!f.remote || c.remote === f.remote) &&
      (!f.levels.length || f.levels.includes(c.levelBucket)) &&
      (!words.length || words.every((w) => searchText(c).includes(w))),
  );
  // Cards arrive within-reach first; "newest" re-sorts by date only.
  return f.sort === "newest" ? [...out].sort((a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? "")) : out;
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
