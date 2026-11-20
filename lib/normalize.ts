import { designCategory, detectRegions, isBroadEurope, isInEurope, isUnrestricted, remoteFromText, seniorityFromTitle } from "./classify";
import { htmlToText, normKey } from "./text";
import type { Job, RawPosting } from "./types";

/** Turn a raw posting into a Job, or null if it is not a product/UX/UI design role. */
export function normalize(raw: RawPosting, source: string, sourceType: "board" | "ats"): Job | null {
  const category = designCategory(raw.title);
  if (!category) return null;

  const description = raw.descriptionText?.trim() || htmlToText(raw.descriptionHtml ?? "");
  const locTexts = [raw.location, ...(raw.regionHints ?? [])];
  const remote = raw.remote ?? remoteFromText([raw.location, raw.title]);
  let regions = detectRegions(locTexts);
  // A remote role whose location says nothing more than "remote" is open worldwide.
  if (remote === "remote" && regions.length === 0) regions = isUnrestricted(locTexts) ? ["Worldwide"] : ["Other"];

  // Can someone based in Estonia apply without relocating?
  let openToEstonia: boolean | null = null;
  if (regions.includes("Estonia")) openToEstonia = true;
  else if (remote === "remote") {
    if (regions.includes("Worldwide") || isBroadEurope(locTexts)) openToEstonia = true;
    else if (regions.length || !isUnrestricted(locTexts)) openToEstonia = false; // restricted to specific countries/regions
  } else if (raw.location.trim()) openToEstonia = false; // on-site/hybrid elsewhere: needs relocation

  return {
    id: raw.sourceId,
    title: raw.title.trim(),
    company: raw.company.trim(),
    location: raw.location.trim() || (remote === "remote" ? "Remote" : "Not stated"),
    remote,
    regions,
    openToEstonia,
    seniority: seniorityFromTitle(raw.title, raw.seniorityHint),
    category,
    postedAt: raw.postedAt,
    source,
    sourceType,
    alsoListedOn: [],
    url: raw.url,
    description,
  };
}

/** Scope: remote roles anywhere, plus on-site/hybrid roles in Europe (Estonia included). */
export function inScope(job: Job): boolean {
  if (job.remote === "remote") return true;
  return isInEurope([job.location, ...job.regions]);
}

/**
 * Remove duplicates. Same company + same title counts as one posting
 * (boards often re-list ATS jobs, and ATSs often post one role per city).
 * Keep the most complete version: ATS over board, then the longest description.
 */
export function dedupe(jobs: Job[]): { jobs: Job[]; removed: number } {
  const groups = new Map<string, Job[]>();
  for (const j of jobs) {
    const title = normKey(j.title).replace(/\b(remote|hybrid|f m d|m w d|w m d|all genders)\b/g, "").replace(/\s+/g, " ").trim();
    const key = `${normKey(j.company)}|${title}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(j);
  }
  const out: Job[] = [];
  for (const g of groups.values()) {
    g.sort((a, b) =>
      (a.sourceType === "ats" ? 0 : 1) - (b.sourceType === "ats" ? 0 : 1) ||
      b.description.length - a.description.length,
    );
    const best = { ...g[0] };
    const locs = new Set(g.map((x) => x.location));
    if (locs.size > 1) best.location = [...locs].join(" · ");
    best.regions = [...new Set(g.flatMap((x) => x.regions))];
    if (g.some((x) => x.openToEstonia)) best.openToEstonia = true;
    if (g.some((x) => x.remote === "remote")) best.remote = best.remote === "unknown" ? "remote" : best.remote;
    best.alsoListedOn = [...new Set(g.map((x) => x.source))].filter((s) => s !== best.source);
    best.postedAt = g.map((x) => x.postedAt).filter(Boolean).sort()[0] ?? null;
    out.push(best);
  }
  return { jobs: out, removed: jobs.length - out.length };
}
