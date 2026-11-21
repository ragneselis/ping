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

const partOfDay = (d: Date) => {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(d));
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
};

/**
 * The data note, in Ping's voice and Tallinn time, from the stored run data:
 * "Ping went out at 06:00 this morning and found 1,278 roles. Back tomorrow at 06:00."
 * The last round says "this morning" or "yesterday" only while it is under 36 hours old; after that it
 * names the date. A stored next run that has already passed rolls forward a day at a time (the refresh
 * is daily), so the sentence never points into the past.
 */
export function scoutNote(postings: number, lastRun: string | null, nextRun: string | null, now = new Date()): string {
  const roles = `${postings.toLocaleString("en-GB")} ${postings === 1 ? "role" : "roles"}`;
  if (!lastRun) return `Ping is tracking ${roles}. The time of the last round was not recorded.`;
  const last = new Date(lastRun);
  const day = now.getTime() - last.getTime() > 36 * HOUR ? dayMonth(last) : relativeDay(last, now);
  const when =
    day === "today" ? `at ${clock(last)} this ${partOfDay(last)}` : day === "yesterday" ? `yesterday at ${clock(last)}` : `on ${day} at ${clock(last)}`;
  let sentence = `Ping went out ${when} and found ${roles}.`;
  if (nextRun) {
    const next = new Date(nextRun);
    while (next.getTime() <= now.getTime()) next.setTime(next.getTime() + DAY);
    const nextDay = relativeDay(next, now);
    sentence += ` Back ${nextDay === "today" || nextDay === "tomorrow" ? nextDay : `on ${nextDay}`} at ${clock(next)}.`;
  }
  return sentence;
}
