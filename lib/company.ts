/**
 * Companies Ping tracks: the shape of data/companies.json and helpers shared by the pipeline,
 * the weekly discovery, the Companies page and the Jobs company filter. Client-safe: no file access
 * (the list is read by loadCompanies in lib/data.ts).
 */
import { z } from "zod";

/** The eight public job boards (detect.ts can find these from a careers page). */
export const BOARDS = ["greenhouse", "lever", "ashby", "teamtailor", "workable", "recruitee", "smartrecruiters", "personio"] as const;
/** Everything Ping can read: the boards, plus the readers in lib/sources/readers.ts. */
export const ATS = [...BOARDS, "workday", "teamdash", "custom"] as const;
export type Ats = (typeof ATS)[number];
export const ATS_LABEL: Record<Ats, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  teamtailor: "Teamtailor",
  workable: "Workable",
  recruitee: "Recruitee",
  smartrecruiters: "SmartRecruiters",
  personio: "Personio",
  workday: "Workday",
  teamdash: "Teamdash",
  custom: "Own careers site",
};

export const CompanySchema = z
  .object({
  name: z.string().min(1),
  /** The page that lists their open roles (their own careers page, or the public board). */
  careersUrl: z.url(),
  /** How Ping reads their jobs. Absent when careersLinkOnly. */
  ats: z.enum(ATS).optional(),
  /** Board slug per ATS. For Teamtailor and Personio it can also be a custom careers host ("jobs.example.com");
   *  for Workday "tenant.wdN/Site", for Teamdash the careers page listing the jobs, for custom the reader's name. */
  slug: z.string().min(1).optional(),
  /** Ping cannot read their jobs (own system, CV.ee only, no public list): Discover shows the careers link. */
  careersLinkOnly: z.boolean().optional(),
  /** Has designers in Estonia (headquartered there, or a real team in Tallinn or Tartu): listed on Discover. */
  inEstonia: z.boolean().optional(),
  /** One short, factual line about what they do, for Discover. */
  description: z.string().max(90).optional(),
  /** Lever's EU instance. */
  eu: z.boolean().optional(),
  /** Headquartered in Estonia: every posting of theirs counts as open to Estonia. */
  basedInEstonia: z.boolean(),
  /** YYYY-MM-DD */
  addedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  addedBy: z.enum(["manual", "discovery"]),
  })
  .refine((c) => c.careersLinkOnly || (c.ats && c.slug), { message: "a readable company needs ats and slug" });
export type Company = z.infer<typeof CompanySchema>;
/** A company whose jobs Ping reads. */
export type ReadableCompany = Company & { ats: Ats; slug: string };
export const isReadable = (c: Company): c is ReadableCompany => !c.careersLinkOnly && !!c.ats && !!c.slug;

/** URL-safe key for a company name: "Bob W" -> "bob-w", "Skeleton Technologies" -> "skeleton-technologies". */
export function companySlug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Gambling, betting and iGaming companies: Ping does not list them (a job board for students).
 * Their postings are dropped from every source at fetch time (scripts/fetch.ts), and weekly discovery
 * skips them (the model flags them too). Matched on companySlug, so spelling variants of the name work.
 */
const GAMBLING = [
  "Betsson", "Playtech", "Relax Gaming", "Sisu Group", "Studioworks", "Evolution", "Evolution Gaming", "EvoGame",
  "Coolbet", "Games Global", "Kindred", "Kindred Group", "Entain", "Paf", "Optibet", "Olybet", "Unibet", "Bet365",
  "Flutter", "Betway", "Yolo Group", "Kambi", "LeoVegas", "Pragmatic Play", "Skywind", "Gaming Innovation Group",
  "Push Gaming", "Hacksaw Gaming", "Light & Wonder", "Novibet", "Tipico", "Betsafe", "Bragg Gaming", "Stake",
];
const GAMBLING_KEYS = new Set(GAMBLING.map((n) => companySlug(n)));
/** Words that mark a company as gambling in its own name ("Something Casino", "BetCo"). */
const GAMBLING_NAME = /\b(casino|betting|sportsbook|igaming|i-gaming|gambling|lottery|poker|slots)\b/i;

export function isGambling(company: string): boolean {
  return GAMBLING_KEYS.has(companySlug(company)) || GAMBLING_NAME.test(company);
}

/** The public board page for an ATS slug: a careers URL when a company has no page of its own. */
export function boardUrl(ats: Ats, slug: string, eu = false): string {
  const host = (fallback: string) => (slug.includes(".") ? slug : fallback);
  switch (ats) {
    case "greenhouse":
      return `https://job-boards.greenhouse.io/${slug}`;
    case "lever":
      return `https://jobs${eu ? ".eu" : ""}.lever.co/${slug}`;
    case "ashby":
      return `https://jobs.ashbyhq.com/${slug}`;
    case "teamtailor":
      return `https://${host(`${slug}.teamtailor.com`)}/jobs`;
    case "workable":
      return `https://apply.workable.com/${slug}/`;
    case "recruitee":
      return `https://${slug}.recruitee.com/`;
    case "smartrecruiters":
      return `https://careers.smartrecruiters.com/${slug}`;
    case "personio":
      return `https://${host(`${slug}.jobs.personio.de`)}/`;
    case "workday": {
      const [hostPart, site] = slug.split("/");
      return `https://${hostPart}.myworkdayjobs.com/${site}`;
    }
    case "teamdash":
      return `https://${slug}`;
    case "custom":
      return slug === "bolt" ? "https://bolt.eu/en/careers/positions/" : "https://ping.ragne.me/";
  }
}

/** The id prefix every posting from this company's board carries (see lib/sources/ats.ts). */
export function boardIdPrefix(c: Pick<ReadableCompany, "ats" | "slug">): string {
  if (c.ats === "teamtailor") return `teamtailor:${c.slug.includes(".") ? c.slug : `${c.slug}.teamtailor.com`}:`;
  if (c.ats === "personio") return `personio:${c.slug.includes(".") ? c.slug : `${c.slug}.jobs.personio.de`}:`;
  return `${c.ats}:${c.slug}:`;
}
