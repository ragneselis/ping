/**
 * When the refresh runs, in one place. Client-safe.
 *
 * Ping goes out twice a week, on Monday and Thursday (RUN_DAYS). GitHub delays scheduled workflows at
 * busy times, and can skip them, so each run day has three triggers (.github/workflows/refresh.yml and
 * vercel.json), each starting the same workflow:
 *   schedule    03:47 UTC, off the hour to avoid GitHub's peak (05:47 in Tallinn in winter)
 *   backup      04:41 UTC, a second schedule an hour later
 *   vercel-cron 05:20 UTC, Vercel calls /api/cron/refresh, which dispatches the workflow
 * plus "manual" (started by hand, any day). Every trigger but manual first checks data/run.json and does
 * nothing when today's run (Tallinn date) already succeeded; the workflow's concurrency group never lets
 * two runs go at once. Keep the crons in the workflow and vercel.json in step with these. Weekly
 * discovery runs on Mondays at 03:00 UTC, before the Monday run.
 */
export const RUN_UTC = { hour: 3, minute: 47 };
export const BACKUP_UTC = { hour: 4, minute: 41 };
export const CRON_UTC = { hour: 5, minute: 20 };

/** Run days, as getUTCDay() numbers (the UTC and Tallinn day agree at these hours): Monday and Thursday. */
export const RUN_DAYS = [1, 4] as const;
const CRON_DAYS = RUN_DAYS.join(",");

/** The workflow's two cron strings, as GitHub reports them in github.event.schedule. */
export const RUN_CRON = `${RUN_UTC.minute} ${RUN_UTC.hour} * * ${CRON_DAYS}`;
export const BACKUP_CRON = `${BACKUP_UTC.minute} ${BACKUP_UTC.hour} * * ${CRON_DAYS}`;

/** Readers' words for the rhythm: "Monday and Thursday". */
export const RUN_DAYS_LABEL = "Monday and Thursday";

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
/** A run day with no run this long after the main schedule (past the backups and the Vercel cron, plus a run's length) counts as missed. */
export const MISSED_AFTER_HOURS = 3;

export const TZ = "Europe/Tallinn";

/** The Tallinn calendar day of a moment, "2026-11-22". */
export const tallinnDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

/** Whether a calendar day ("2026-11-23") is a run day. */
export const isRunDay = (day: string) => (RUN_DAYS as readonly number[]).includes(new Date(`${day}T12:00:00Z`).getUTCDay());

/** The scheduled start (RUN_UTC) on a calendar day. */
export const dueOn = (day: string) => new Date(`${day}T${String(RUN_UTC.hour).padStart(2, "0")}:${String(RUN_UTC.minute).padStart(2, "0")}:00Z`);

/** The next scheduled start after a moment. */
export function nextRunAfter(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), RUN_UTC.hour, RUN_UTC.minute));
  while (d <= now || !(RUN_DAYS as readonly number[]).includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

/** The latest scheduled start at or before a moment. */
export function lastRunDue(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), RUN_UTC.hour, RUN_UTC.minute));
  while (d > now || !(RUN_DAYS as readonly number[]).includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

/** One run as data/run.json keeps it (history, newest last). */
export interface RunRecord {
  /** When the run finished (the stamp step). */
  at: string;
  /** When the workflow started. */
  startedAt?: string;
  trigger: Trigger;
}
