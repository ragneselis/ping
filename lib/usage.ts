/**
 * Anonymous usage stats, shared by the browser beacon (components/usage-beacon.tsx), the collector
 * (app/api/track) and /stats. The method is ragne.me's: no cookie, no IP, no user agent, no account;
 * a request is looked at, a few daily counters go up, and nothing about who is kept.
 *
 * Everything is a counter in daily_counts (env, Tallinn day, field): one row per field per day.
 *
 *   v  v:/path  d:m  d:d  r:host  c:EE     page views, per page, phone or desktop, referrer, country
 *   u                                      visitors: a browser, once per Tallinn day
 *   job:<id>  jobcat:<direction>           job posting clicks
 *   f:<filter>:<value>  q:<search>         filters and searches used
 *   m:open  m:sent                         "Get new jobs" opened, sign-up sent
 *   g:play  g:best (a maximum, not a sum)  snake games started, best score
 *   sub:signup  sub:confirm  sub:unsub     subscriptions (server-side)
 *   digest:sent  digest:failed             the digest (scripts/digest.ts)
 */
import { CATEGORIES } from "./types";

/** The pages that count as views. Everything else (/stats, the email landing pages) is not a view. */
export const PUBLIC_PAGES = ["/", "/insights", "/privacy"] as const;
export const isPublicPath = (path: unknown): path is string => typeof path === "string" && (PUBLIC_PAGES as readonly string[]).includes(path);

/** Filters and the values that may be recorded for each. */
export const FILTER_VALUES: Record<string, readonly string[]> = {
  category: CATEGORIES,
  level: ["reach", "mid", "senior"],
  estonia: ["1"],
  remote: ["remote", "hybrid", "onsite"],
  sort: ["best", "newest"],
};

/** A search as it is counted: lower case, letters, digits and spaces only, at most 40 characters. */
export function normaliseQuery(q: string): string | null {
  const s = q
    .toLowerCase()
    .replace(/[^\p{L}\p{N} +#/.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  return s.length >= 2 ? s : null;
}

export type UsageEvent =
  | { name: "job"; id: string; category: string }
  | { name: "filter"; filter: string; value: string }
  | { name: "search"; q: string }
  | { name: "subscribe-open" }
  | { name: "subscribe-sent" }
  | { name: "snake-play" }
  | { name: "snake-score"; score: number };

/** The counters an event adds to, or null when it is not valid. `best` is a maximum, not a count. */
export function eventFields(e: UsageEvent): { add: string[]; best?: { field: string; value: number } } | null {
  switch (e.name) {
    case "job":
      // Posting ids carry the source and its URL; the collector also checks the id is a current posting.
      if (typeof e.id !== "string" || !/^[\x21-\x7e]{1,300}$/.test(e.id) || !(CATEGORIES as readonly string[]).includes(e.category)) return null;
      return { add: [`job:${e.id}`, `jobcat:${e.category}`] };
    case "filter":
      if (!FILTER_VALUES[e.filter]?.includes(e.value)) return null;
      return { add: [`f:${e.filter}:${e.value}`] };
    case "search": {
      const q = typeof e.q === "string" ? normaliseQuery(e.q) : null;
      return q ? { add: [`q:${q}`] } : null;
    }
    case "subscribe-open":
      return { add: ["m:open"] };
    case "subscribe-sent":
      return { add: ["m:sent"] };
    case "snake-play":
      return { add: ["g:play"] };
    case "snake-score":
      return Number.isInteger(e.score) && e.score >= 0 && e.score < 10_000 ? { add: [], best: { field: "g:best", value: e.score } } : null;
    default:
      return null;
  }
}
