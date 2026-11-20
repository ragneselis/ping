/**
 * Public job board APIs of applicant tracking systems. These are the official,
 * unauthenticated endpoints companies use to power their own careers pages.
 */
import { getJson, getText, pool } from "../http";
import { decodeEntities, toIso } from "../text";
import { designCategory } from "../classify";
import type { RawPosting, RemoteStatus } from "../types";
import type { SourceResult } from "./boards";

/** Starter list of companies that hire product/UX/UI designers. Board slug per ATS. */
export type Ats = "greenhouse" | "lever" | "ashby" | "teamtailor" | "workable" | "recruitee" | "smartrecruiters" | "personio";

/**
 * Companies that hire product/UX/UI designers. Board slug per ATS
 * (for Teamtailor the slug can also be a custom careers host, e.g. "jobs.example.com").
 */
export const COMPANIES: { name: string; ats: Ats; slug: string; eu?: boolean }[] = [
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
  // Estonian, Baltic and Nordic companies (feeds verified 2026-11-20).
  { name: "Modash", ats: "workable", slug: "modash" },
  { name: "Adcash", ats: "teamtailor", slug: "adcash" },
  { name: "Swedbank", ats: "teamtailor", slug: "jobs.swedbank.com" },
  { name: "Printful", ats: "teamtailor", slug: "printfulinc" },
  { name: "Restream", ats: "ashby", slug: "restream" },
  { name: "Oura", ats: "greenhouse", slug: "oura" },
  { name: "Smartly.io", ats: "greenhouse", slug: "smartlyio" },
  { name: "RELEX", ats: "greenhouse", slug: "relex" },
  { name: "Supercell", ats: "ashby", slug: "supercell" },
  { name: "Housemarque", ats: "greenhouse", slug: "housemarque" },
  { name: "Mentimeter", ats: "greenhouse", slug: "mentimeter" },
  { name: "Lovable", ats: "ashby", slug: "lovable" },
  { name: "Legora", ats: "ashby", slug: "legora" },
  { name: "Embark Studios", ats: "teamtailor", slug: "embarkstudios" },
  { name: "Oda", ats: "teamtailor", slug: "careers.oda.com" },
  { name: "Cognite", ats: "greenhouse", slug: "cognite" },
  { name: "Schibsted", ats: "teamtailor", slug: "schibsted" },
  { name: "Lunar", ats: "teamtailor", slug: "lunar" },
  { name: "Nexos.ai", ats: "lever", slug: "Nexos" },
  { name: "Hostinger", ats: "ashby", slug: "hostinger" },
  { name: "Omnisend", ats: "lever", slug: "omnisend" },
  { name: "Surfshark", ats: "ashby", slug: "surfshark" },
  { name: "Wolt", ats: "greenhouse", slug: "wolt" },
  { name: "Playtech", ats: "smartrecruiters", slug: "playtech" },
  { name: "Testlio", ats: "greenhouse", slug: "testlio" },
  { name: "Nortal", ats: "greenhouse", slug: "nortal" },
  { name: "Bondora", ats: "greenhouse", slug: "bondora" },
  { name: "Inbank", ats: "greenhouse", slug: "inbank" },
  { name: "Zego", ats: "ashby", slug: "zego" },
  { name: "Katana", ats: "ashby", slug: "katana" },
  { name: "Gelato", ats: "ashby", slug: "gelato" },
  { name: "Starship", ats: "teamtailor", slug: "starship" },
  { name: "Lightyear", ats: "teamtailor", slug: "lightyear" },
  { name: "Monese", ats: "teamtailor", slug: "monese" },
  { name: "Comodule", ats: "teamtailor", slug: "comodule" },
  { name: "Salv", ats: "personio", slug: "salv" },
  { name: "Skeleton Technologies", ats: "workable", slug: "skeletontech" },
  { name: "Kahoot", ats: "workable", slug: "kahoot" },
  { name: "Sympower", ats: "recruitee", slug: "sympower" },
  { name: "Montonio", ats: "teamtailor", slug: "careers.montonio.com" },
  { name: "Scoro", ats: "teamtailor", slug: "careers.scoro.com" },
  { name: "Xolo", ats: "workable", slug: "xolo-careers" },
  { name: "Fractory", ats: "teamtailor", slug: "fractory" },
  { name: "Mintos", ats: "teamtailor", slug: "mintos" },
  { name: "Luminor", ats: "teamtailor", slug: "luminorbank" },
  { name: "Wrike", ats: "greenhouse", slug: "wrike" },
  { name: "Tuum", ats: "lever", slug: "tuumplatform", eu: true },
  { name: "Proekspert", ats: "smartrecruiters", slug: "proekspert" },
  { name: "Creem", ats: "ashby", slug: "creem" },
  { name: "Bob W", ats: "teamtailor", slug: "bobw" },
  { name: "LHV UK", ats: "greenhouse", slug: "lhvuk" },
  { name: "Supermetrics", ats: "greenhouse", slug: "supermetricsoy" },
  { name: "Varjo", ats: "workable", slug: "varjo-1" },
  { name: "Remedy", ats: "greenhouse", slug: "remedy" },
  { name: "Reaktor", ats: "ashby", slug: "reaktor" },
  { name: "Futurice", ats: "teamtailor", slug: "careers.futurice.com" },
  { name: "Vincit", ats: "teamtailor", slug: "vincitoyj" },
  { name: "Nitor", ats: "workable", slug: "nitor" },
  { name: "Solita", ats: "greenhouse", slug: "solita" },
  { name: "Siili", ats: "teamtailor", slug: "siili" },
  { name: "Hoxhunt", ats: "ashby", slug: "hoxhunt" },
  { name: "Qvik", ats: "teamtailor", slug: "qvik" },
  { name: "Holvi", ats: "teamtailor", slug: "holvi" },
  { name: "Epidemic Sound", ats: "ashby", slug: "epidemic-sound" },
  { name: "Trustly", ats: "ashby", slug: "trustly" },
  { name: "Truecaller", ats: "greenhouse", slug: "truecaller" },
  { name: "Kry", ats: "teamtailor", slug: "kry-1719827697" },
  { name: "Tibber", ats: "teamtailor", slug: "tibber" },
  { name: "Storytel", ats: "teamtailor", slug: "storytel" },
  { name: "Hemnet", ats: "teamtailor", slug: "hemnet" },
  { name: "Anyfin", ats: "teamtailor", slug: "anyfin" },
  { name: "Detectify", ats: "teamtailor", slug: "detectify" },
  { name: "Quinyx", ats: "teamtailor", slug: "quinyx" },
  { name: "Bannerflow", ats: "teamtailor", slug: "bannerflow" },
  { name: "Vipps", ats: "teamtailor", slug: "vipps" },
  { name: "reMarkable", ats: "teamtailor", slug: "remarkable" },
  { name: "Pleo", ats: "ashby", slug: "pleo" },
  { name: "Too Good To Go", ats: "ashby", slug: "toogoodtogo" },
  { name: "Trustpilot", ats: "greenhouse", slug: "trustpilot" },
  { name: "Templafy", ats: "teamtailor", slug: "templafy" },
  { name: "Corti", ats: "ashby", slug: "corti" },
  { name: "Eneba", ats: "ashby", slug: "eneba" },
  { name: "NFQ", ats: "lever", slug: "nfq" },
  { name: "Boku", ats: "greenhouse", slug: "boku" },
  { name: "Betsson", ats: "greenhouse", slug: "betsson" },
  { name: "Whalar", ats: "greenhouse", slug: "whalar" },
  { name: "Pactum", ats: "teamtailor", slug: "careers.pactum.com" },
  { name: "Outfunnel", ats: "teamtailor", slug: "jobs.outfunnel.com" },
  { name: "Swappie", ats: "teamtailor", slug: "careers.swappie.com" },
  { name: "Vivino", ats: "teamtailor", slug: "careers.vivino.com" },
  { name: "Yousician", ats: "greenhouse", slug: "yousician" },
  { name: "Qminder", ats: "workable", slug: "qminder" },
];

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
async function workable(name: string, slug: string): Promise<RawPosting[]> {
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
    if (!designCategory(j.name)) return null;
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
  greenhouse, lever, ashby, teamtailor, workable, recruitee, smartrecruiters, personio,
};
const LABEL: Record<Ats, string> = {
  greenhouse: "Greenhouse", lever: "Lever", ashby: "Ashby", teamtailor: "Teamtailor",
  workable: "Workable", recruitee: "Recruitee", smartrecruiters: "SmartRecruiters", personio: "Personio",
};

/** One SourceResult per ATS, plus per-company errors in notes. */
export async function allAts(): Promise<(SourceResult & { error?: string })[]> {
  const perCompany = await pool(COMPANIES, 4, async (c) => {
    try {
      return { c, postings: await FETCHERS[c.ats](c.name, c.slug, c.eu), error: null as string | null };
    } catch (e: any) {
      return { c, postings: [] as RawPosting[], error: String(e?.message ?? e) };
    }
  });
  return (Object.keys(LABEL) as Ats[]).filter((ats) => COMPANIES.some((c) => c.ats === ats)).map((ats) => {
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
