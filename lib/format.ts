/** The one date format on both pages: "20 November 2026". Safe to import anywhere (no server-only code). */
export const formatUpdated = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "recently";

const TZ = "Europe/Tallinn";
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const clock = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
const dayMonth = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "long" }).format(d);

/** "today", "tomorrow", "yesterday" or "20 November", by the calendar in Tallinn. */
function relativeDay(d: Date, now: Date): string {
  const k = dayKey(d);
  if (k === dayKey(now)) return "today";
  if (k === dayKey(new Date(now.getTime() + DAY))) return "tomorrow";
  if (k === dayKey(new Date(now.getTime() - DAY))) return "yesterday";
  return dayMonth(d);
}

/**
 * The freshness sentence for the data note, in Tallinn time, from the stored run data:
 * "Updated today at 06:00, next update tomorrow at 06:00."
 * The last run says "today" or "yesterday" only while it is under 36 hours old; after that it shows
 * the real date. A stored next run that has already passed rolls forward a day at a time (the
 * refresh is daily), so the sentence never points into the past.
 */
export function freshness(lastRun: string | null, nextRun: string | null, now = new Date()): string {
  if (!lastRun) return "Update time not recorded yet.";
  const last = new Date(lastRun);
  const age = now.getTime() - last.getTime();
  const lastDay = age > 36 * HOUR ? dayMonth(last) : relativeDay(last, now);
  let sentence = `Updated ${lastDay} at ${clock(last)}`;
  if (nextRun) {
    const next = new Date(nextRun);
    while (next.getTime() <= now.getTime()) next.setTime(next.getTime() + DAY);
    sentence += `, next update ${relativeDay(next, now)} at ${clock(next)}`;
  }
  return `${sentence}.`;
}
