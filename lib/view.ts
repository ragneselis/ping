/**
 * Server-side view layer for the interface: loads the data once per change on disk,
 * turns postings into light job cards, applies URL filters and computes market insights.
 */
import { statSync } from "node:fs";
import path from "node:path";
import { loadClassifiedJobs, loadSources, tally } from "./data";
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
  unspecified: "Level not stated",
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
  seniority: string;
  level: string;
}

export interface Filters {
  category: Category | "";
  estonia: boolean;
  remote: "" | "remote" | "hybrid" | "onsite";
  reach: boolean;
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
    seniority: j.seniority,
    level: LEVEL_LABEL[j.seniority] ?? j.seniority,
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
  return { category, estonia: one("estonia") === "1", remote, reach: one("reach") === "1" };
}

export function applyFilters(cards: JobCard[], f: Filters): JobCard[] {
  return cards.filter(
    (c) =>
      (!f.category || c.primary === f.category) &&
      (!f.estonia || c.openToEstonia) &&
      (!f.remote || c.remote === f.remote) &&
      (!f.reach || c.withinReach),
  );
}

/* ---------- Market insights ---------- */

export interface Insight {
  postings: number;
  withRequirements: number;
  skills: { label: string; count: number; share: number }[];
  tools: { label: string; count: number; share: number }[];
  seniority: { label: string; count: number }[];
  years: { label: string; count: number }[];
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
  const ex = jobs.map((j) => j.extraction).filter((e): e is Extraction => !!e);
  const n = ex.length || 1;
  const withShare = (items: { label: string; count: number }[]) => items.slice(0, top).map((i) => ({ ...i, share: Math.round((i.count / n) * 100) }));
  const years = ex.map((e) => e.yearsMin).filter((y): y is number => typeof y === "number");
  const levels = new Map<string, number>();
  for (const j of jobs) levels.set(j.seniority, (levels.get(j.seniority) ?? 0) + 1);
  return {
    postings: jobs.length,
    withRequirements: ex.length,
    skills: withShare(tally(ex.map((e) => e.skills))),
    tools: withShare(tally(ex.map((e) => tools(e.tools)))),
    seniority: SENIORITY_ORDER.map((s) => ({ label: SENIORITY_LABEL[s], count: levels.get(s) ?? 0 })),
    years: YEAR_BUCKETS.map((b) => ({ label: b.label, count: years.filter(b.test).length })),
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
