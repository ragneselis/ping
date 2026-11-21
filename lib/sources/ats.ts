/**
 * Public job board APIs of applicant tracking systems. These are the official,
 * unauthenticated endpoints companies use to power their own careers pages.
 */
import { getJson, getText, pool, sleep } from "../http";
import { decodeEntities, toIso } from "../text";
import { designCandidate } from "../classify";
import type { RawPosting, RemoteStatus } from "../types";
import type { SourceResult } from "./boards";
import { ATS_LABEL, boardIdPrefix, isReadable, type Ats, type Company } from "../company";
import { custom, teamdash, workday } from "./readers";
import { loadCompanies } from "../data";

export type { Ats };

/* The companies whose boards are read live in data/companies.json (lib/company.ts, loadCompanies). */
function wp(v: string | undefined | null): RemoteStatus | undefined {
  const s = (v ?? "").toLowerCase();
  if (s.includes("remote") || s === "fully") return "remote";
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

async function lever(name: string, slug: string, eu = false): Promise<RawPosting[]> {
  const d = await getJson<any[]>(`https://api${eu ? ".eu" : ""}.lever.co/v0/postings/${slug}?mode=json`, 60000);
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

/* Teamtailor: every career site publishes /jobs.rss with locations and remote status. */
function xmlField(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`));
  return m ? m[1].trim().replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1").trim() : "";
}

async function teamtailor(name: string, slug: string): Promise<RawPosting[]> {
  const host = slug.includes(".") ? slug : `${slug}.teamtailor.com`;
  const xml = await getText(`https://${host}/jobs.rss`, 60000);
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const it = m[1];
    const locs = [...it.matchAll(/<tt:location>([\s\S]*?)<\/tt:location>/g)].map((l) =>
      [xmlField(l[1], "tt:city") || xmlField(l[1], "tt:name"), xmlField(l[1], "tt:country")].filter(Boolean).join(", "),
    );
    const remoteStatus = xmlField(it, "remoteStatus");
    const link = xmlField(it, "link");
    return {
      sourceId: `teamtailor:${host}:${xmlField(it, "guid") || link}`,
      title: decodeEntities(xmlField(it, "title")),
      company: name,
      location: [...new Set(locs)].join(" · "),
      remote: remoteStatus === "none" ? undefined : wp(remoteStatus),
      regionHints: locs,
      postedAt: toIso(xmlField(it, "pubDate")),
      url: link,
      descriptionHtml: decodeEntities(xmlField(it, "description")),
    } satisfies RawPosting;
  });
}

/* Workable: the public careers widget API. */
/* Workable rate-limits bursts, so its boards are fetched one at a time with a short pause. */
let workableQueue: Promise<unknown> = Promise.resolve();

async function workable(name: string, slug: string): Promise<RawPosting[]> {
  const turn = workableQueue.then(() => sleep(1500));
  workableQueue = turn;
  await turn;
  const d = await getJson<any>(`https://apply.workable.com/api/v1/widget/accounts/${slug}?details=true`, 60000);
  return (d.jobs ?? []).map((j: any) => {
    const locs = (j.locations?.length ? j.locations : [j]).map((l: any) => [l.city, l.country].filter(Boolean).join(", "));
    return {
      sourceId: `workable:${slug}:${j.shortcode}`,
      title: j.title,
      company: name,
      location: [...new Set(locs)].join(" · "),
      remote: j.telecommuting === true || j.telecommuting === "true" ? "remote" : wp(j.title),
      regionHints: locs,
      seniorityHint: [j.experience ?? ""],
      postedAt: toIso(j.published_on ?? j.created_at),
      url: j.url,
      descriptionHtml: j.description ?? "",
    } satisfies RawPosting;
  });
}

/* Recruitee: public offers API of every Recruitee careers site. */
async function recruitee(name: string, slug: string): Promise<RawPosting[]> {
  const d = await getJson<any>(`https://${slug}.recruitee.com/api/offers/`, 60000);
  return (d.offers ?? []).map((j: any) => {
    const locs = (j.locations ?? []).map((l: any) => [l.name ?? l.city, l.country].filter(Boolean).join(", "));
    return {
      sourceId: `recruitee:${slug}:${j.id}`,
      title: j.title,
      company: name,
      location: j.location || locs.join(" · "),
      remote: j.remote ? "remote" : j.hybrid ? "hybrid" : j.on_site ? "onsite" : undefined,
      regionHints: [j.location ?? "", j.country ?? "", ...locs],
      seniorityHint: [j.experience_code ?? ""],
      postedAt: toIso(j.published_at ?? j.created_at),
      url: j.careers_url,
      descriptionHtml: [j.description ?? "", j.requirements ?? ""].join("\n"),
    } satisfies RawPosting;
  });
}

/* SmartRecruiters: public postings API. The list has no description, so details are fetched for design titles only. */
async function smartrecruiters(name: string, slug: string): Promise<RawPosting[]> {
  const list: any[] = [];
  for (let offset = 0; offset < 2000; offset += 100) {
    const d = await getJson<any>(`https://api.smartrecruiters.com/v1/companies/${slug}/postings?limit=100&offset=${offset}`, 60000);
    list.push(...(d.content ?? []));
    if (list.length >= (d.totalFound ?? 0) || !(d.content ?? []).length) break;
  }
  const details = await pool(list, 4, async (j) => {
    if (!designCandidate(j.name)) return null;
    try { return await getJson<any>(`https://api.smartrecruiters.com/v1/companies/${slug}/postings/${j.id}`, 30000); } catch { return null; }
  });
  return list.map((j, i) => {
    const loc = j.location ?? {};
    const where = [loc.city, loc.country?.length === 2 ? loc.fullLocation?.split(",").pop()?.trim() : loc.country].filter(Boolean).join(", ");
    const sections = details[i]?.jobAd?.sections ?? {};
    return {
      sourceId: `smartrecruiters:${slug}:${j.id}`,
      title: j.name,
      company: name,
      location: where,
      remote: loc.remote ? "remote" : loc.hybrid ? "hybrid" : "onsite",
      regionHints: [loc.fullLocation ?? "", where],
      seniorityHint: [j.experienceLevel?.label ?? ""],
      postedAt: toIso(j.releasedDate),
      url: details[i]?.postingUrl ?? `https://jobs.smartrecruiters.com/${slug}/${j.id}`,
      descriptionHtml: Object.values(sections).map((s: any) => `<h3>${s?.title ?? ""}</h3>${s?.text ?? ""}`).join("\n"),
    } satisfies RawPosting;
  });
}

/* Personio: public XML feed of every Personio careers page. */
async function personio(name: string, slug: string): Promise<RawPosting[]> {
  const host = slug.includes(".") ? slug : `${slug}.jobs.personio.de`;
  const xml = await getText(`https://${host}/xml?language=en`, 60000);
  return [...xml.matchAll(/<position>([\s\S]*?)<\/position>/g)].map((m) => {
    const p = m[1];
    const offices = [xmlField(p, "office"), ...[...p.matchAll(/<additionalOffice>([\s\S]*?)<\/additionalOffice>/g)].map((o) => o[1].trim())].filter(Boolean);
    const desc = [...p.matchAll(/<jobDescription>([\s\S]*?)<\/jobDescription>/g)].map((d) => `<h3>${xmlField(d[1], "name")}</h3>${xmlField(d[1], "value")}`).join("\n");
    const id = xmlField(p, "id");
    return {
      sourceId: `personio:${host}:${id}`,
      title: decodeEntities(xmlField(p, "name")),
      company: name,
      location: offices.join(" · "),
      remote: wp(offices.join(" ")),
      regionHints: offices,
      seniorityHint: [xmlField(p, "seniority")],
      postedAt: toIso(xmlField(p, "createdAt")),
      url: `https://${host}/job/${id}?language=en`,
      descriptionHtml: decodeEntities(desc),
    } satisfies RawPosting;
  });
}

export const FETCHERS: Record<Ats, (name: string, slug: string, eu?: boolean) => Promise<RawPosting[]>> = {
  greenhouse, lever, ashby, teamtailor, workable, recruitee, smartrecruiters, personio, workday, teamdash, custom,
};

/** A company whose board could not be read today: its postings from the last good run are kept (scripts/fetch.ts). */
export interface FailedCompany {
  name: string;
  ats: Ats;
  /** Posting ids from this board start with it (boardIdPrefix). */
  prefix: string;
  error: string;
}

/**
 * Every board on the list (data/companies.json): one SourceResult per ATS, plus the companies whose
 * board failed. A company with zero open roles, or zero design roles, is simply an empty board.
 */
export async function allAts(all: Company[] = loadCompanies()): Promise<{ results: SourceResult[]; failedCompanies: FailedCompany[] }> {
  // Careers-link-only companies have nothing to read: Discover shows their careers page instead.
  const companies = all.filter(isReadable);
  const perCompany = await pool(companies, 4, async (c) => {
    try {
      return { c, postings: await FETCHERS[c.ats](c.name, c.slug, c.eu), error: null as string | null };
    } catch (e: any) {
      return { c, postings: [] as RawPosting[], error: String(e?.message ?? e) };
    }
  });
  const results = (Object.keys(ATS_LABEL) as Ats[])
    .filter((ats) => companies.some((c) => c.ats === ats))
    .map((ats) => {
      const rows = perCompany.filter((r) => r.c.ats === ats);
      const counts = rows.map((r) => `${r.c.name} ${r.error ? "FAILED" : r.postings.length}`).join(", ");
      return {
        source: ATS_LABEL[ats],
        sourceType: "ats" as const,
        fetched: rows.reduce((n, r) => n + r.postings.length, 0),
        postings: rows.flatMap((r) => r.postings),
        notes: `all open roles per company: ${counts}`,
      };
    });
  const failedCompanies = perCompany
    .filter((r) => r.error)
    .map((r) => ({ name: r.c.name, ats: r.c.ats, prefix: boardIdPrefix(r.c), error: r.error! }));
  return { results, failedCompanies };
}
