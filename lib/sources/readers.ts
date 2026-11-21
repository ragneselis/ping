/**
 * Readers for companies whose careers sites are not on one of the eight boards in ats.ts, but which
 * serve their jobs to every visitor in a structured form. Each returns RawPostings like the board
 * fetchers, so the jobs go through the same normalising, scope, dedupe, classification, requirements
 * and failure guards (scripts/fetch.ts). Checked before adding (docs/COMPANIES.md): robots.txt allows
 * the pages read, and the site terms do not forbid it. Never CV.ee or LinkedIn.
 *
 *   workday   any Workday careers site: the public JSON the site itself calls (/wday/cxs/...).
 *             slug "tenant.wdN/Site", e.g. "teliacompany.wd3/Telia_careers".
 *   teamdash  Teamdash job pages (an Estonian hiring system) linked from the company's own careers
 *             page. slug: that careers page, e.g. "www.helmes.com/career/".
 *   custom    one reader per site, slug = its name: "bolt" (bolt.eu/careers, the position records the
 *             page renders).
 * Full descriptions are fetched only for titles that could be design work, to stay light on each site.
 */
import { getJson, getText, pool } from "../http";
import { designCandidate } from "../classify";
import { decodeEntities, toIso } from "../text";
import type { RawPosting, RemoteStatus } from "../types";
import { USER_AGENT } from "../http";

/* ---------- Next.js flight data (the records a Next.js page renders, in its own HTML) ---------- */

/** The React Server Components payload of a Next.js page: every self.__next_f.push string, joined. */
function flightOf(html: string): string {
  let flight = "";
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) flight += JSON.parse(m[1]);
  return flight;
}

/** Every JSON object in `text` that starts where `start` matches, parsed. */
function objectsAt(text: string, start: RegExp): unknown[] {
  const out: unknown[] = [];
  for (const m of text.matchAll(start)) {
    let depth = 0;
    let i = m.index!;
    for (; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        for (i++; text[i] !== '"'; i++) if (text[i] === "\\") i++;
        continue;
      }
      if (ch === "{") depth++;
      else if (ch === "}" && --depth === 0) break;
    }
    try {
      out.push(JSON.parse(text.slice(m.index, i + 1)));
    } catch {
      /* not a whole object: skip */
    }
  }
  return out;
}

/** A flight text row ("<id>:T<hex length>,<text>"), the way long HTML is sent. */
function flightText(flight: string, id: string): string | null {
  const m = flight.match(new RegExp(`(?:^|\\n|[^0-9a-f])${id}:T([0-9a-f]+),`));
  if (!m) return null;
  const start = m.index! + m[0].length;
  return Buffer.from(flight.slice(start)).subarray(0, parseInt(m[1], 16)).toString("utf8");
}

/* ---------- Bolt ---------- */

interface BoltPosition {
  id: string;
  header: { roleTitle: string; parentTeamTitle?: string; locations?: { city?: string; country?: string }[] };
  body: { description?: string; jobPostedDate?: string };
}

async function bolt(name: string): Promise<RawPosting[]> {
  const base = "https://bolt.eu/en/careers/positions/";
  const flight = flightOf(await getText(base, 60000));
  const positions = (objectsAt(flight, /\{"id":"[0-9a-f-]{36}","header":/g) as BoltPosition[]).filter((p) => p.header?.roleTitle);
  if (!positions.length) throw new Error("Bolt: no positions found in the careers page");
  const unique = [...new Map(positions.map((p) => [p.id, p])).values()];
  // The full description, for titles that could be design work: the detail page renders it from a text row.
  const details = await pool(unique, 3, async (p) => {
    if (!designCandidate(p.header.roleTitle)) return null;
    try {
      const f = flightOf(await getText(`${base}${p.id}/`, 30000));
      const ref = f.match(/"__html":"\$([0-9a-f]+)"/);
      return ref ? flightText(f, ref[1]) : null;
    } catch {
      return null;
    }
  });
  return unique.map((p, i) => {
    const locs = (p.header.locations ?? []).map((l) => [l.city, l.country].filter(Boolean).join(", "));
    return {
      sourceId: `custom:bolt:${p.id}`,
      title: p.header.roleTitle,
      company: name,
      location: [...new Set(locs)].join(" · "),
      regionHints: locs,
      postedAt: toIso(p.body.jobPostedDate?.replace(/^\$D/, "") ?? null),
      url: `${base}${p.id}/`,
      descriptionHtml: details[i] ?? `<p>${p.body.description ?? ""}</p>`,
    } satisfies RawPosting;
  });
}

const CUSTOM: Record<string, (name: string) => Promise<RawPosting[]>> = { bolt };

export async function custom(name: string, slug: string): Promise<RawPosting[]> {
  const reader = CUSTOM[slug];
  if (!reader) throw new Error(`No custom reader named ${slug}`);
  return reader(name);
}

/* ---------- Workday ---------- */

const remoteOf = (s: string | undefined): RemoteStatus | undefined => {
  const v = (s ?? "").toLowerCase();
  return v.includes("remote") ? "remote" : v.includes("hybrid") ? "hybrid" : v.includes("site") || v.includes("office") ? "onsite" : undefined;
};

async function workdayPost<T>(url: string, body: unknown): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "User-Agent": USER_AGENT, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    if (res.status === 429 && attempt < 3) {
      await new Promise((r) => setTimeout(r, 5000 * 2 ** attempt));
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json() as Promise<T>;
  }
}

export async function workday(name: string, slug: string): Promise<RawPosting[]> {
  const [hostPart, site] = slug.split("/");
  const [tenant] = hostPart.split(".");
  const origin = `https://${hostPart}.myworkdayjobs.com`;
  const api = `${origin}/wday/cxs/${tenant}/${site}`;
  const list: { title: string; externalPath: string; locationsText?: string; remoteType?: string }[] = [];
  for (let offset = 0; offset < 2000; offset += 20) {
    const d = await workdayPost<{ total: number; jobPostings: typeof list }>(`${api}/jobs`, { appliedFacets: {}, limit: 20, offset, searchText: "" });
    list.push(...(d.jobPostings ?? []));
    if (!d.jobPostings?.length || list.length >= d.total) break;
  }
  const details = await pool(list, 3, async (j) => {
    if (!designCandidate(j.title)) return null;
    try {
      return (await getJson<{ jobPostingInfo: { jobDescription?: string; location?: string; additionalLocations?: string[]; country?: { descriptor?: string }; startDate?: string; externalUrl?: string; remoteType?: string } }>(`${api}${j.externalPath}`, 30000)).jobPostingInfo;
    } catch {
      return null;
    }
  });
  return list.map((j, i) => {
    const d = details[i];
    const locs = d ? [d.location, ...(d.additionalLocations ?? [])].filter((l): l is string => !!l) : [j.locationsText ?? ""];
    return {
      sourceId: `workday:${slug}:${j.externalPath}`,
      title: j.title,
      company: name,
      location: [...new Set(locs)].join(" · "),
      remote: remoteOf(d?.remoteType ?? j.remoteType),
      regionHints: [...locs, d?.country?.descriptor ?? ""],
      postedAt: toIso(d?.startDate ?? null),
      url: d?.externalUrl ?? `${origin}/${site}${j.externalPath}`,
      descriptionHtml: d?.jobDescription ?? "",
    } satisfies RawPosting;
  });
}

/* ---------- Teamdash ---------- */

const PLACES = /\b(Tallinn|Tartu|Pärnu|Narva|Viljandi|Riga|Vilnius|Kaunas|Helsinki|Stockholm)\b/g;

export async function teamdash(name: string, slug: string): Promise<RawPosting[]> {
  const page = await getText(`https://${slug}`, 30000);
  const links = [...new Set([...page.matchAll(/https:\/\/[a-z0-9-]+\.teamdash\.com\/p\/job\/[A-Za-z0-9]+\/[a-z0-9-]+/g)].map((m) => m[0]))];
  const titleOf = (url: string) => decodeURIComponent(url.split("/").pop()!).replace(/-/g, " ");
  const details = await pool(links, 3, async (url) => {
    // The slug in the link is the title; only possible design work is opened.
    if (!designCandidate(titleOf(url))) return null;
    try {
      return await getText(url, 30000);
    } catch {
      return null;
    }
  });
  return links.map((url, i) => {
    const html = details[i];
    const title = html?.match(/<meta property="og:title" content="([^"]*)"/)?.[1];
    const body = html ? html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").match(/<main[\s\S]*<\/main>|<body[\s\S]*<\/body>/)?.[0] ?? "" : "";
    // Teamdash pages name the place only in the text; Ping's Teamdash companies are all based in Estonia.
    const places = [...new Set([...body.matchAll(PLACES)].map((m) => m[1]))];
    const location = places.length ? places.join(" · ") : "Estonia";
    return {
      sourceId: `teamdash:${slug}:${url.split("/p/job/")[1]}`,
      title: decodeEntities(title ?? titleOf(url)),
      company: name,
      location,
      remote: /\bremote\b/i.test(body) ? (/\bhybrid\b/i.test(body) ? "hybrid" : "remote") : /\bhybrid\b/i.test(body) ? "hybrid" : undefined,
      regionHints: [location],
      postedAt: null,
      url,
      descriptionHtml: body,
    } satisfies RawPosting;
  });
}
