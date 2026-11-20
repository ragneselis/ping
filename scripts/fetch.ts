/**
 * Pull postings from every source, normalise, filter to product/UX/UI design,
 * keep the scope (remote anywhere + on-site/hybrid in Europe), dedupe, save to data/.
 *
 *   npm run fetch
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { arbeitnow, himalayas, lemanoosh, remoteOk, remotive, weWorkRemotely, type SourceResult } from "../lib/sources/boards";
import { allAts } from "../lib/sources/ats";
import { dedupe, inScope, normalize } from "../lib/normalize";
import type { Job, SourceReport } from "../lib/types";

/** Boards that list nothing but design jobs: skip the title pre-filter, the model still checks each posting. */
const DESIGN_ONLY_SOURCES = new Set(["Lemanoosh"]);

async function safe(name: string, fn: () => Promise<SourceResult>): Promise<SourceResult & { error?: string }> {
  try {
    return await fn();
  } catch (e: any) {
    return { source: name, sourceType: "board", fetched: 0, postings: [], error: String(e?.message ?? e) };
  }
}

async function main() {
  const t0 = Date.now();
  const results = [
    ...(await Promise.all([
      safe("Remote OK", remoteOk),
      safe("We Work Remotely", weWorkRemotely),
      safe("Himalayas", himalayas),
      safe("Remotive", remotive),
      safe("Arbeitnow", arbeitnow),
      safe("Lemanoosh", () => lemanoosh()),
    ])),
    ...(await allAts()),
  ];

  const reports: SourceReport[] = [];
  const all: Job[] = [];
  for (const r of results) {
    const matched = r.postings.map((p) => normalize(p, r.source, r.sourceType, DESIGN_ONLY_SOURCES.has(r.source))).filter((j): j is Job => !!j);
    const scoped = matched.filter(inScope);
    all.push(...scoped);
    reports.push({
      source: r.source,
      sourceType: r.sourceType,
      ok: !r.error,
      error: r.error,
      fetched: r.fetched,
      candidates: matched.length,
      inScope: scoped.length,
      notes: r.notes,
    });
    console.log(`${r.source.padEnd(18)} fetched ${String(r.fetched).padStart(5)}  candidates ${String(matched.length).padStart(4)}  in scope ${String(scoped.length).padStart(4)}${r.error ? "  ERROR " + r.error : ""}`);
  }

  const { jobs, removed } = dedupe(all);
  jobs.sort((a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? ""));
  console.log(`\nTotal in scope ${all.length}, duplicates removed ${removed}, unique ${jobs.length} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

  mkdirSync("data", { recursive: true });
  writeFileSync("data/jobs.json", JSON.stringify(jobs, null, 2));
  writeFileSync(
    "data/sources.json",
    JSON.stringify({ fetchedAt: new Date().toISOString(), totalInScope: all.length, duplicatesRemoved: removed, unique: jobs.length, sources: reports }, null, 2),
  );
}

main();
