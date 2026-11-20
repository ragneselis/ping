export type RemoteStatus = "remote" | "hybrid" | "onsite" | "unknown";

export type Seniority =
  | "intern"
  | "junior"
  | "mid"
  | "senior"
  | "staff/principal"
  | "lead/manager"
  | "unspecified";

export type Category = "product" | "ux" | "ui";

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
  category: Category;
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
  /** Postings that matched product/UX/UI design. */
  designMatches: number;
  /** Matches inside scope (remote anywhere, or on-site/hybrid in Europe). */
  inScope: number;
  notes?: string;
}

export interface Requirements {
  id: string;
  skills: string[];
  tools: string[];
  experienceLevel: string;
  yearsMin: number | null;
  yearsMax: number | null;
  education: string | null;
  languages: string[];
  other: string[];
}
