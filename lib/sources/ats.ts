/**
 * Public job board APIs of applicant tracking systems. These are the official,
 * unauthenticated endpoints companies use to power their own careers pages.
 */
import { getJson, pool } from "../http";
import { toIso } from "../text";
import type { RawPosting, RemoteStatus } from "../types";
import type { SourceResult } from "./boards";

/** Starter list of companies that hire product/UX/UI designers. Board slug per ATS. */
export const COMPANIES: { name: string; ats: "greenhouse" | "lever" | "ashby"; slug: string }[] = [
  { name: "Figma", ats: "greenhouse", slug: "figma" },
  { name: "Airbnb", ats: "greenhouse", slug: "airbnb" },
  { name: "Stripe", ats: "greenhouse", slug: "stripe" },
  { name: "Discord", ats: "greenhouse", slug: "discord" },
  { name: "Dropbox", ats: "greenhouse", slug: "dropbox" },
  { name: "Pinterest", ats: "greenhouse", slug: "pinterest" },
  { name: "GitLab", ats: "greenhouse", slug: "gitlab" },
  { name: "Duolingo", ats: "greenhouse", slug: "duolingo" },
  { name: "Asana", ats: "greenhouse", slug: "asana" },
  { name: "Miro", ats: "greenhouse", slug: "realtimeboardglobal" },
  { name: "Wise", ats: "greenhouse", slug: "wise" },
  { name: "Veriff", ats: "greenhouse", slug: "veriff" },
  { name: "Intercom", ats: "greenhouse", slug: "intercom" },
  { name: "Monzo", ats: "greenhouse", slug: "monzo" },
  { name: "N26", ats: "greenhouse", slug: "n26" },
  { name: "Typeform", ats: "greenhouse", slug: "typeform" },
  { name: "Vercel", ats: "greenhouse", slug: "vercel" },
  { name: "Spotify", ats: "lever", slug: "spotify" },
  { name: "Pipedrive", ats: "lever", slug: "pipedrive" },
  { name: "Notion", ats: "ashby", slug: "notion" },
  { name: "Linear", ats: "ashby", slug: "linear" },
  { name: "Ramp", ats: "ashby", slug: "ramp" },
  { name: "ElevenLabs", ats: "ashby", slug: "elevenlabs" },
  { name: "Supabase", ats: "ashby", slug: "supabase" },
  { name: "Glia", ats: "ashby", slug: "glia" },
  { name: "Webflow", ats: "ashby", slug: "webflow" },
];

function wp(v: string | undefined | null): RemoteStatus | undefined {
  const s = (v ?? "").toLowerCase();
  if (s.includes("remote")) return "remote";
  if (s.includes("hybrid")) return "hybrid";
  if (s.includes("onsite") || s.includes("on-site") || s.includes("office")) return "onsite";
  return undefined;
}

async function greenhouse(name: string, slug: string): Promise<RawPosting[]> {
  const d = await getJson<any>(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`, 60000);
  return (d.jobs ?? []).map((j: any) => {
    const loc = j.location?.name ?? "";
    const offices = (j.offices ?? []).map((o: any) => o.name).join(", ");
    return {
      sourceId: `greenhouse:${slug}:${j.id}`,
      title: j.title,
      company: name,
      location: loc,
      remote: wp(loc),
      regionHints: [loc, offices],
      postedAt: toIso(j.first_published ?? j.updated_at),
      url: j.absolute_url,
      descriptionHtml: j.content ?? "",
    } satisfies RawPosting;
  });
}

async function lever(name: string, slug: string): Promise<RawPosting[]> {
  const d = await getJson<any[]>(`https://api.lever.co/v0/postings/${slug}?mode=json`, 60000);
  return d.map((j) => {
    const loc = j.categories?.location ?? "";
    const allLocs = (j.categories?.allLocations ?? []).join(", ");
    const html = [j.description ?? "", ...(j.lists ?? []).map((l: any) => `<h3>${l.text}</h3><ul>${l.content}</ul>`), j.additional ?? ""].join("\n");
    return {
      sourceId: `lever:${slug}:${j.id}`,
      title: j.text,
      company: name,
      location: allLocs || loc,
      remote: wp(j.workplaceType) ?? wp(loc),
      regionHints: [loc, allLocs, j.country ?? ""],
      postedAt: toIso(j.createdAt),
      url: j.hostedUrl,
      descriptionHtml: html,
    } satisfies RawPosting;
  });
}

async function ashby(name: string, slug: string): Promise<RawPosting[]> {
  const d = await getJson<any>(`https://api.ashbyhq.com/posting-api/job-board/${slug}`, 60000);
  return (d.jobs ?? [])
    .filter((j: any) => j.isListed !== false)
    .map((j: any) => {
      const secondary = (j.secondaryLocations ?? []).map((s: any) => s.location).filter(Boolean);
      const country = j.address?.postalAddress?.addressCountry ?? "";
      const locs = [j.location, ...secondary].filter(Boolean).join(", ");
      return {
        sourceId: `ashby:${slug}:${j.id}`,
        title: j.title,
        company: name,
        location: locs,
        remote: wp(j.workplaceType) ?? (j.isRemote ? "remote" : undefined),
        regionHints: [locs, country],
        postedAt: toIso(j.publishedAt),
        url: j.jobUrl,
        descriptionHtml: j.descriptionHtml ?? "",
        descriptionText: j.descriptionPlain,
      } satisfies RawPosting;
    });
}

const FETCHERS = { greenhouse, lever, ashby };
const LABEL = { greenhouse: "Greenhouse", lever: "Lever", ashby: "Ashby" };

/** One SourceResult per ATS, plus per-company errors in notes. */
export async function allAts(): Promise<(SourceResult & { error?: string })[]> {
  const perCompany = await pool(COMPANIES, 4, async (c) => {
    try {
      return { c, postings: await FETCHERS[c.ats](c.name, c.slug), error: null as string | null };
    } catch (e: any) {
      return { c, postings: [] as RawPosting[], error: String(e?.message ?? e) };
    }
  });
  return (["greenhouse", "lever", "ashby"] as const).map((ats) => {
    const rows = perCompany.filter((r) => r.c.ats === ats);
    const failed = rows.filter((r) => r.error);
    const counts = rows.map((r) => `${r.c.name} ${r.error ? "FAILED" : r.postings.length}`).join(", ");
    return {
      source: LABEL[ats],
      sourceType: "ats" as const,
      fetched: rows.reduce((n, r) => n + r.postings.length, 0),
      postings: rows.flatMap((r) => r.postings),
      notes: `all open roles per company: ${counts}`,
      error: failed.length === rows.length && rows.length ? failed.map((f) => f.error).join("; ") : undefined,
    };
  });
}
