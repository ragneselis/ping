import { runTimeTallinn, TZ } from "./schedule";

/** The one date format on both pages: "20 November 2026". Safe to import anywhere (no server-only code). */
export const formatUpdated = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "recently";

const clock = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);

/**
 * The data note: "Ping's last trip: 22 Nov at 05:52. Next one every day at 05:47." Absolute, in Tallinn
 * time, from the last successful run; never relative wording, so it cannot go stale on an open page.
 */
export function tripNote(lastRun: string | null, now = new Date()): string {
  const next = `Next one every day at ${runTimeTallinn(now)}.`;
  if (!lastRun) return `Ping's last trip is not recorded yet. ${next}`;
  const last = new Date(lastRun);
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short" }).format(last);
  return `Ping's last trip: ${day} at ${clock(last)}. ${next}`;
}
