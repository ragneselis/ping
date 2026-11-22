import { TZ } from "./schedule";

/** The one date format on both pages: "20 November 2026". Safe to import anywhere (no server-only code). */
export const formatUpdated = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "recently";

const clock = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);

/**
 * The data note: "Ping last went out on 22 November at 08:36 and found 1,281 roles. Next trip every
 * morning at 06:00." The first sentence is the last successful run, absolute and in Tallinn time; the
 * second is fixed (the schedule's cron minute and its backups are not the reader's business). Never
 * relative wording, so it cannot go stale on an open page.
 */
export const NEXT_TRIP = "Next trip every morning at 06:00.";

export function tripNote(lastRun: string | null, roles: number): string {
  const found = `${roles.toLocaleString("en-GB")} ${roles === 1 ? "role" : "roles"}`;
  if (!lastRun) return `Ping is tracking ${found}. ${NEXT_TRIP}`;
  const last = new Date(lastRun);
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "long" }).format(last);
  return `Ping last went out on ${day} at ${clock(last)} and found ${found}. ${NEXT_TRIP}`;
}
