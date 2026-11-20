/**
 * Pick a varied sample of ~20 postings for the extraction test:
 * round-robin across sources, preferring roles open to Estonia and mixed seniority.
 *
 *   npm run sample
 */
import { readFileSync, writeFileSync } from "node:fs";
import type { Job } from "../lib/types";

const N = Number(process.argv[2] ?? 20);
const jobs: Job[] = JSON.parse(readFileSync("data/jobs.json", "utf8"));

const bySource = new Map<string, Job[]>();
for (const j of jobs) {
  if (j.description.length < 400) continue;
  (bySource.get(j.source) ?? bySource.set(j.source, []).get(j.source)!).push(j);
}
for (const list of bySource.values()) {
  list.sort((a, b) => Number(b.openToEstonia) - Number(a.openToEstonia) || a.seniority.localeCompare(b.seniority));
  // Interleave seniorities inside each source.
  const groups = new Map<string, Job[]>();
  for (const j of list) (groups.get(j.seniority) ?? groups.set(j.seniority, []).get(j.seniority)!).push(j);
  list.length = 0;
  const gs = [...groups.values()];
  while (gs.some((g) => g.length)) for (const g of gs) if (g.length) list.push(g.shift()!);
}

const picked: Job[] = [];
const queues = [...bySource.values()];
while (picked.length < N && queues.some((q) => q.length)) {
  for (const q of queues) if (q.length && picked.length < N) picked.push(q.shift()!);
}

writeFileSync(
  "data/sample.json",
  JSON.stringify(picked.map(({ id, title, company, location, description }) => ({ id, title, company, location, description: description.slice(0, 12000) })), null, 2),
);
console.log(`Sampled ${picked.length}:`);
for (const p of picked) console.log(`  ${p.source.padEnd(17)} ${p.seniority.padEnd(16)} ${p.title} @ ${p.company}`);
