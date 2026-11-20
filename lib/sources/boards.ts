/**
 * Public remote job boards. All of these publish an official public feed/API.
 * Remote OK and Himalayas ask for attribution with a link back, which the UI will need later.
 */
import { getJson, getText, pool, sleep } from "../http";
import { decodeEntities, toIso } from "../text";
import type { RawPosting } from "../types";
import { remoteFromText } from "../classify";

export interface SourceResult {
  source: string;
  sourceType: "board" | "ats";
  fetched: number;
  postings: RawPosting[];
  notes?: string;
}

/* Remote OK: https://remoteok.com/api (first item is a legal notice). */
export async function remoteOk(): Promise<SourceResult> {
  const seen = new Map<string, any>();
  // The plain feed is the latest ~100 jobs across all categories; tag feeds add design-specific ones.
  for (const url of ["https://remoteok.com/api", "https://remoteok.com/api?tag=design", "https://remoteok.com/api?tag=ux", "https://remoteok.com/api?tag=ui", "https://remoteok.com/api?tag=designer"]) {
    try {
      const data = await getJson<any[]>(url);
      for (const j of data) if (j && j.id && j.position) seen.set(String(j.id), j);
    } catch { /* tag feed may not exist; the main feed is what matters */ }
    await sleep(1000);
  }
  const all = [...seen.values()];
  return {
    source: "Remote OK",
    sourceType: "board",
    fetched: all.length,
    postings: all.map((j) => ({
      sourceId: `remoteok:${j.id}`,
      title: decodeEntities(j.position),
      company: decodeEntities(j.company ?? ""),
      location: j.location || "Remote",
      remote: "remote",
      regionHints: [j.location || "Worldwide"],
      postedAt: toIso(j.date ?? j.epoch),
      url: j.url,
      descriptionHtml: j.description ?? "",
    })),
  };
}

/* We Work Remotely: official category RSS feeds. */
function rssItems(xml: string): Record<string, string>[] {
  const items: Record<string, string>[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const rec: Record<string, string> = {};
    for (const f of m[1].matchAll(/<([a-z:]+)[^>]*>([\s\S]*?)<\/\1>/g)) {
      rec[f[1]] = f[2].replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1").trim();
    }
    items.push(rec);
  }
  return items;
}

export async function weWorkRemotely(): Promise<SourceResult> {
  const feeds = [
    "https://weworkremotely.com/categories/remote-design-jobs.rss",
    "https://weworkremotely.com/categories/remote-product-jobs.rss",
  ];
  const byLink = new Map<string, Record<string, string>>();
  for (const f of feeds) {
    try {
      for (const it of rssItems(await getText(f))) byLink.set(it.link ?? it.guid, it);
    } catch { /* one feed failing should not kill the source */ }
    await sleep(1000);
  }
  const items = [...byLink.values()];
  return {
    source: "We Work Remotely",
    sourceType: "board",
    fetched: items.length,
    postings: items.map((it) => {
      const full = decodeEntities(it.title ?? "");
      const idx = full.indexOf(":");
      const company = idx > 0 ? full.slice(0, idx).trim() : "";
      const title = idx > 0 ? full.slice(idx + 1).trim() : full;
      const region = decodeEntities(it.region ?? "");
      return {
        sourceId: `wwr:${it.guid ?? it.link}`,
        title,
        company,
        location: region || "Remote",
        remote: "remote" as const,
        regionHints: [region, it.country ?? ""],
        postedAt: toIso(it.pubDate),
        url: it.link ?? it.guid,
        descriptionHtml: decodeEntities(it.description ?? ""),
      };
    }),
  };
}

/* Himalayas: public search API, 20 results per page. */
export async function himalayas(): Promise<SourceResult> {
  const queries = [
    "designer", "product designer", "ux designer", "ui designer", "design lead", "design engineer", "ux researcher",
    "service designer", "brand designer", "graphic designer", "visual designer", "motion designer", "art director",
    "creative director", "illustrator", "industrial designer", "game designer", "level designer", "technical artist",
  ];
  const seen = new Map<string, any>();
  for (const q of queries) {
    for (let page = 1; page <= 5; page++) {
      try {
        const d = await getJson<any>(`https://himalayas.app/jobs/api/search?q=${encodeURIComponent(q)}&page=${page}`);
        const jobs: any[] = d.jobs ?? [];
        for (const j of jobs) seen.set(j.guid ?? j.applicationLink, j);
        if (jobs.length < 20) break;
      } catch { break; }
      await sleep(700);
    }
  }
  const all = [...seen.values()];
  return {
    source: "Himalayas",
    sourceType: "board",
    fetched: all.length,
    notes: `search queries: ${queries.join(", ")}`,
    postings: all.map((j) => {
      const restr: string[] = j.locationRestrictions ?? [];
      return {
        sourceId: `himalayas:${j.guid}`,
        title: j.title,
        company: j.companyName ?? "",
        location: restr.length ? `Remote (${restr.join(", ")})` : "Remote (Worldwide)",
        remote: "remote" as const,
        regionHints: restr.length ? restr : ["Worldwide"],
        seniorityHint: j.seniority ?? [],
        postedAt: toIso(j.pubDate),
        url: j.applicationLink ?? j.guid,
        descriptionHtml: j.description ?? j.excerpt ?? "",
      };
    }),
  };
}

/* Remotive: public API. */
export async function remotive(): Promise<SourceResult> {
  const seen = new Map<string, any>();
  for (const url of [
    "https://remotive.com/api/remote-jobs?category=design",
    "https://remotive.com/api/remote-jobs?search=designer",
    "https://remotive.com/api/remote-jobs?category=product",
  ]) {
    try {
      const d = await getJson<any>(url);
      for (const j of d.jobs ?? []) seen.set(String(j.id), j);
    } catch { /* ignore */ }
    await sleep(1000);
  }
  const all = [...seen.values()];
  return {
    source: "Remotive",
    sourceType: "board",
    fetched: all.length,
    postings: all.map((j) => ({
      sourceId: `remotive:${j.id}`,
      title: j.title,
      company: j.company_name ?? "",
      location: j.candidate_required_location || "Remote",
      remote: "remote" as const,
      regionHints: [j.candidate_required_location || "Worldwide"],
      postedAt: toIso(j.publication_date),
      url: j.url,
      descriptionHtml: j.description ?? "",
    })),
  };
}

/* Arbeitnow: public API, Europe-focused (mostly Germany), both on-site and remote. */
export async function arbeitnow(): Promise<SourceResult> {
  const all: any[] = [];
  for (let page = 1; page <= 8; page++) {
    try {
      const d = await getJson<any>(`https://www.arbeitnow.com/api/job-board-api?page=${page}`);
      all.push(...(d.data ?? []));
      if (!d.links?.next) break;
    } catch { break; }
    await sleep(800);
  }
  return {
    source: "Arbeitnow",
    sourceType: "board",
    fetched: all.length,
    notes: "first 8 pages of the general feed (no server-side search)",
    postings: all.map((j) => ({
      sourceId: `arbeitnow:${j.slug}`,
      title: j.title,
      company: j.company_name ?? "",
      location: j.location || (j.remote ? "Remote" : ""),
      remote: j.remote ? ("remote" as const) : remoteFromText([j.title, j.location ?? ""]) === "hybrid" ? ("hybrid" as const) : ("onsite" as const),
      regionHints: [j.location ?? ""].filter(Boolean),
      postedAt: toIso(j.created_at),
      url: j.url,
      descriptionHtml: j.description ?? "",
    })),
  };
}

/*
 * Lemanoosh: curated industrial design job board. Its RSS feed has titles and links only,
 * so each job page is read for company, location and description (schema.org microdata).
 */
export async function lemanoosh(pages = 10): Promise<SourceResult> {
  const items: Record<string, string>[] = [];
  for (let page = 1; page <= pages; page++) {
    try {
      const got = rssItems(await getText(`https://lemanoosh.com/feed/?post_type=job&paged=${page}`));
      items.push(...got);
      if (got.length < 10) break;
    } catch { break; }
    await sleep(700);
  }
  const first = (html: string, re: RegExp) => html.match(re)?.[1]?.trim() ?? "";
  const postings = await pool(items, 3, async (it): Promise<RawPosting | null> => {
    try {
      const html = await getText(it.link);
      await sleep(300);
      const location = decodeEntities(first(html, /itemprop="address"[^>]*content="([^"]*)"/));
      return {
        sourceId: `lemanoosh:${it.link}`,
        title: decodeEntities(first(html, /itemprop="title"[^>]*>([^<]*)</) || it.title),
        company: decodeEntities(first(html, /itemprop="hiringOrganization"[^>]*>([^<]*)</)),
        location,
        remote: remoteFromText([location, it.title]) === "remote" ? "remote" : undefined,
        regionHints: [location],
        postedAt: toIso(it.pubDate),
        url: it.link,
        descriptionHtml: first(html, /itemprop="description"[^>]*>([\s\S]*?)<\/div>/),
      };
    } catch {
      return null;
    }
  });
  const ok = postings.filter((p): p is RawPosting => !!p);
  return { source: "Lemanoosh", sourceType: "board", fetched: ok.length, postings: ok, notes: `industrial design board, ${pages} RSS pages + job pages` };
}
