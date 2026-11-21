/**
 * Last step of the daily refresh: record when this run finished and when the next one is due,
 * so the page can say "Updated today at 06:00, next update tomorrow at 06:00".
 *
 *   npm run stamp      # writes data/run.json and data/seen.json
 *
 * data/seen.json maps every current posting id to when Ping first saw it. The email digest uses it
 * to send only jobs added since a subscriber's last email (a posting's own date can be old or missing).
 *
 * The schedule is the GitHub Actions cron in .github/workflows/daily-refresh.yml: every day at
 * 04:00 UTC (06:00 in Tallinn in winter, 07:00 in summer). Keep RUN_HOUR_UTC in step with it.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const RUN_HOUR_UTC = 4;

const now = new Date();
const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), RUN_HOUR_UTC));
if (next <= now) next.setUTCDate(next.getUTCDate() + 1);

const sources = existsSync("data/sources.json") ? JSON.parse(readFileSync("data/sources.json", "utf8")) : null;
// Whole sources that failed, then single company boards (both kept their last good postings).
const failedSources: string[] = [
  ...(sources?.sources ?? []).filter((s: { ok: boolean }) => !s.ok).map((s: { source: string }) => s.source),
  ...(sources?.failedCompanies ?? []).map((c: { name: string }) => `${c.name} board`),
];

const run = {
  lastRun: now.toISOString(),
  nextRun: next.toISOString(),
  schedule: `daily at ${String(RUN_HOUR_UTC).padStart(2, "0")}:00 UTC`,
  failedSources,
};
// First-seen times: keep known ones, stamp new postings with this run, drop postings that are gone.
const jobs: { id: string }[] = existsSync("data/jobs.json") ? JSON.parse(readFileSync("data/jobs.json", "utf8")) : [];
const seenBefore: Record<string, string> = existsSync("data/seen.json") ? JSON.parse(readFileSync("data/seen.json", "utf8")) : {};
const stamp = now.toISOString().replace(/\.\d{3}Z$/, "Z");
const seen = Object.fromEntries(jobs.map((j) => [j.id, seenBefore[j.id] ?? stamp]).sort(([a], [b]) => (a < b ? -1 : 1)));
const added = jobs.filter((j) => !seenBefore[j.id]).length;
// One posting per line keeps the daily diff readable.
writeFileSync("data/seen.json", `{\n${Object.entries(seen).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(",\n")}\n}\n`);
console.log(`First seen: ${added} new postings stamped, ${jobs.length} tracked`);

writeFileSync("data/run.json", JSON.stringify(run, null, 2) + "\n");
console.log(`Run recorded: ${run.lastRun}, next ${run.nextRun}${failedSources.length ? `, failed sources: ${failedSources.join(", ")}` : ""}`);
