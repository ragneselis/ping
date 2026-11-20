export type RemoteStatus = "remote" | "hybrid" | "onsite" | "unknown";

export type Seniority =
  | "intern"
  | "junior"
  | "mid"
  | "senior"
  | "staff/principal"
  | "lead/manager"
  | "unspecified";

/** Kind of design work, decided by the model from the posting text (a posting can have several). */
export const CATEGORIES = [
  "product",
  "design-engineer",
  "ai-behaviour",
  "brand-visual",
  "research-service",
  "customer-facing",
  "game",
  "industrial",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  product: "Product designer who ships",
  "design-engineer": "Design engineer / builder",
  "ai-behaviour": "AI and behaviour designer",
  "brand-visual": "Brand and visual craft",
  "research-service": "Research and service design",
  "customer-facing": "Customer-facing / forward deployed designer",
  game: "Game design",
  industrial: "Industrial design",
  other: "Other design paths",
};

/** One normalised job posting, the same shape for every source. */
export interface Job {
  id: string;
  title: string;
  company: string;
  /** Human readable location, as the source states it. */
  location: string;
  remote: RemoteStatus;
  /** Who can apply, coarse regions: Worldwide, Europe, Estonia, US, ... */
  regions: string[];
  /** True if someone based in Estonia can realistically apply (remote open to EU/worldwide, or located in Estonia). */
  openToEstonia: boolean | null;
  seniority: Seniority;
  /** ISO date string, or null if the source does not say. */
  postedAt: string | null;
  source: string;
  sourceType: "board" | "ats";
  /** Other sources where the same posting was found (after dedupe). */
  alsoListedOn: string[];
  url: string;
  /** Full description as plain text. */
  description: string;
}

/** Raw-ish posting a source adapter produces before classification. */
export interface RawPosting {
  sourceId: string;
  title: string;
  company: string;
  location: string;
  /** Source-declared remote status, if it has one. */
  remote?: RemoteStatus;
  /** Extra location text used for region detection (restrictions, offices...). */
  regionHints?: string[];
  seniorityHint?: string[];
  postedAt: string | null;
  url: string;
  descriptionHtml?: string;
  descriptionText?: string;
}

export interface SourceReport {
  source: string;
  sourceType: "board" | "ats";
  ok: boolean;
  error?: string;
  /** Postings the source returned in total (all job types). */
  fetched: number;
  /** Postings whose title passed the broad design pre-filter (sent to the model). */
  candidates: number;
  /** Matches inside scope (remote anywhere, or on-site/hybrid in Europe). */
  inScope: number;
  notes?: string;
}

export interface Requirements {
  skills: string[];
  tools: string[];
  experienceLevel: string;
  yearsMin: number | null;
  yearsMax: number | null;
  education: string | null;
  languages: string[];
  other: string[];
}

/** One model call per posting: is it design work, which categories, and what it asks for. */
export interface Extraction extends Requirements {
  id: string;
  isDesignRole: boolean;
  categories: Category[];
  categoryReason: string;
  model: string;
  extractedAt: string;
  usage: { input: number; output: number; cacheRead: number; cacheWrite: number };
}

/** A candidate posting joined with its extraction (if it has one yet). */
export interface ClassifiedJob extends Job {
  categories: Category[];
  extraction: Extraction | null;
}
