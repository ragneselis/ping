/**
 * When the daily refresh runs, in one place. Client-safe.
 *
 * GitHub delays scheduled workflows at busy times, and can skip them, so the refresh has three triggers
 * (.github/workflows/daily-refresh.yml and vercel.json), each starting the same workflow:
 *   schedule    03:47 UTC, off the hour to avoid GitHub's peak
 *   backup      04:41 UTC, a second schedule an hour later
 *   vercel-cron 05:20 UTC, Vercel calls /api/cron/refresh, which dispatches the workflow
 * plus "manual" (started by hand). Every trigger but manual first checks data/run.json and does nothing
 * when today's run (Tallinn date) already succeeded; the workflow's concurrency group never lets two
 * runs go at once. Keep the crons in the workflow and vercel.json in step with these.
 */
export const RUN_UTC = { hour: 3, minute: 47 };
export const BACKUP_UTC = { hour: 4, minute: 41 };
export const CRON_UTC = { hour: 5, minute: 20 };

/** The workflow's two cron strings, as GitHub reports them in github.event.schedule. */
export const RUN_CRON = `${RUN_UTC.minute} ${RUN_UTC.hour} * * *`;
export const BACKUP_CRON = `${BACKUP_UTC.minute} ${BACKUP_UTC.hour} * * *`;

export const TRIGGERS = ["schedule", "backup", "vercel-cron", "manual"] as const;
export type Trigger = (typeof TRIGGERS)[number];
export const TRIGGER_LABEL: Record<Trigger, string> = {
  schedule: "Schedule",
  backup: "Backup schedule",
  "vercel-cron": "Vercel cron",
  manual: "Manual",
};

/** A run that started this long after the main schedule counts as late. */
export const LATE_AFTER_MINUTES = 30;

export const TZ = "Europe/Tallinn";

/** The Tallinn calendar day of a moment, "2026-11-22". */
export const tallinnDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

/** The scheduled run time on a given day, in Tallinn: "05:47" in winter, "06:47" in summer. */
export function runTimeTallinn(day = new Date()): string {
  const at = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), RUN_UTC.hour, RUN_UTC.minute));
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(at);
}

/** One run as data/run.json keeps it (history, newest last). */
export interface RunRecord {
  /** When the run finished (the stamp step). */
  at: string;
  /** When the workflow started. */
  startedAt?: string;
  trigger: Trigger;
}
