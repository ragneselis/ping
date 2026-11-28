import { RUN_DAYS, TZ } from "./schedule";

/** The one date format on both pages: "20 November 2026". Safe to import anywhere (no server-only code). */
export const formatUpdated = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "recently";

const clock = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);

/** The trip time readers see, always 06:00 Tallinn (the schedule's cron minute and backups are not their business). */
export const TRIP_HOUR = 6;
const TRIP_TIME = `${String(TRIP_HOUR).padStart(2, "0")}:00`;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * The data note's second sentence, from the current Tallinn time only (never from data/run.json or
 * whether a run happened): the next run day (RUN_DAYS, Monday and Thursday) at 06:00, counting a run
 * day itself until 06:00. "Next trip Monday at 06:00." or "Next trip Thursday at 06:00." The note
 * recomputes it in the browser on load and when the page regains focus.
 */
export function nextTrip(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "long", hour: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const today = WEEKDAYS.indexOf(parts.find((p) => p.type === "weekday")!.value);
  const hour = Number(parts.find((p) => p.type === "hour")!.value);
  let ahead = hour < TRIP_HOUR ? 0 : 1;
  while (!(RUN_DAYS as readonly number[]).includes((today + ahead) % 7)) ahead++;
  return `Next trip ${WEEKDAYS[(today + ahead) % 7]} at ${TRIP_TIME}.`;
}

/**
 * The data note's first sentence: "Ping last went out on 22 November at 08:36 and found 1,281 roles."
 * The last successful run, absolute and in Tallinn time.
 */
export function lastTrip(lastRun: string | null, roles: number): string {
  const found = `${roles.toLocaleString("en-GB")} ${roles === 1 ? "role" : "roles"}`;
  if (!lastRun) return `Ping is tracking ${found}.`;
  const last = new Date(lastRun);
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "long" }).format(last);
  return `Ping last went out on ${day} at ${clock(last)} and found ${found}.`;
}
