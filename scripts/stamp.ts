/**
 * Last step of the daily refresh: record when this run finished and when the next one is due,
 * so the page can say "Updated today at 06:00, next update tomorrow at 06:00".
 *
 *   npm run stamp      # writes data/run.json
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
const failedSources: string[] = (sources?.sources ?? []).filter((s: { ok: boolean }) => !s.ok).map((s: { source: string }) => s.source);

const run = {
  lastRun: now.toISOString(),
  nextRun: next.toISOString(),
  schedule: `daily at ${String(RUN_HOUR_UTC).padStart(2, "0")}:00 UTC`,
  failedSources,
};
writeFileSync("data/run.json", JSON.stringify(run, null, 2) + "\n");
console.log(`Run recorded: ${run.lastRun}, next ${run.nextRun}${failedSources.length ? `, failed sources: ${failedSources.join(", ")}` : ""}`);
