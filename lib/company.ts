/**
 * Companies Ping tracks: the shape of data/companies.json and helpers shared by the pipeline,
 * the weekly discovery, the Companies page and the Jobs company filter. Client-safe: no file access
 * (the list is read by loadCompanies in lib/data.ts).
 */
import { z } from "zod";

export const ATS = ["greenhouse", "lever", "ashby", "teamtailor", "workable", "recruitee", "smartrecruiters", "personio"] as const;
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
};

export const CompanySchema = z.object({
  name: z.string().min(1),
  /** The page that lists their open roles (their own careers page, or the public board). */
  careersUrl: z.url(),
  ats: z.enum(ATS),
  /** Board slug per ATS. For Teamtailor and Personio it can also be a custom careers host ("jobs.example.com"). */
  slug: z.string().min(1),
  /** Lever's EU instance. */
  eu: z.boolean().optional(),
  /** Headquartered in Estonia: every posting of theirs counts as open to Estonia. */
  basedInEstonia: z.boolean(),
  /** YYYY-MM-DD */
  addedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  addedBy: z.enum(["manual", "discovery"]),
});
export type Company = z.infer<typeof CompanySchema>;

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
  }
}

/** The id prefix every posting from this company's board carries (see lib/sources/ats.ts). */
export function boardIdPrefix(c: Pick<Company, "ats" | "slug">): string {
  if (c.ats === "teamtailor") return `teamtailor:${c.slug.includes(".") ? c.slug : `${c.slug}.teamtailor.com`}:`;
  if (c.ats === "personio") return `personio:${c.slug.includes(".") ? c.slug : `${c.slug}.jobs.personio.de`}:`;
  return `${c.ats}:${c.slug}:`;
}
