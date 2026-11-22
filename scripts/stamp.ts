/**
 * Last step of the daily refresh: record when this run finished, which trigger started it and when the
 * next one is due (data/run.json), so the data note can say "Ping's last trip: 22 Nov at 05:52" and
 * /stats can show missed, late and backup-started runs.
 *
 *   npm run stamp      # writes data/run.json and data/seen.json
 *
 * data/seen.json maps every current posting id to when Ping first saw it. The email digest uses it
 * to send only jobs added since a subscriber's last email (a posting's own date can be old or missing).
 *
 * The schedule is the GitHub Actions cron in .github/workflows/daily-refresh.yml: every day at
 * 03:47 UTC with backups (lib/schedule.ts). RUN_TRIGGER and RUN_STARTED come from the workflow.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { RUN_CRON, RUN_UTC, TRIGGERS, type RunRecord, type Trigger } from "../lib/schedule";


const now = new Date();
const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), RUN_UTC.hour, RUN_UTC.minute));
if (next <= now) next.setUTCDate(next.getUTCDate() + 1);

const sources = existsSync("data/sources.json") ? JSON.parse(readFileSync("data/sources.json", "utf8")) : null;
// Whole sources that failed, then single company boards (both kept their last good postings).
const failedSources: string[] = [
  ...(sources?.sources ?? []).filter((s: { ok: boolean }) => !s.ok).map((s: { source: string }) => s.source),
  ...(sources?.failedCompanies ?? []).map((c: { name: string }) => `${c.name} board`),
];

const before = existsSync("data/run.json") ? JSON.parse(readFileSync("data/run.json", "utf8")) : {};
const trigger: Trigger = (TRIGGERS as readonly string[]).includes(process.env.RUN_TRIGGER ?? "") ? (process.env.RUN_TRIGGER as Trigger) : "manual";
const record: RunRecord = { at: now.toISOString(), ...(process.env.RUN_STARTED ? { startedAt: process.env.RUN_STARTED } : {}), trigger };
const run = {
  lastRun: now.toISOString(),
  lastStatus: "success",
  trigger,
  nextRun: next.toISOString(),
  schedule: `daily, cron "${RUN_CRON}" (UTC), with backups`,
  failedSources,
  // Two months of runs, for /stats (missed, late, which trigger).
  history: [...((before.history as RunRecord[] | undefined) ?? []), record].slice(-60),
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
