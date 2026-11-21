/**
 * Writing and reading the anonymous usage counters (lib/usage.ts). Server only.
 * A lost count is cheaper than a failed request: every write here swallows its errors.
 */
import { sql } from "./db";

/** "prod" on the live site and in the daily workflow; "dev" for local and preview runs. */
export const statsEnv = () => (process.env.VERCEL_ENV === "production" || process.env.GITHUB_ACTIONS === "true" ? "prod" : "dev");

const TALLINN = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Tallinn", year: "numeric", month: "2-digit", day: "2-digit" });
/** The Tallinn date of a moment, as 2026-11-21. */
export const tallinnDay = (at: Date = new Date()) => TALLINN.format(at);

/** Add one to each field for today (duplicates count once). */
export async function count(fields: string[], env = statsEnv()) {
  const unique = [...new Set(fields)].filter((f) => f.length <= 320);
  if (!unique.length) return;
  try {
    await sql()`
      insert into daily_counts (env, day, field, n)
      select ${env}, ${tallinnDay()}::date, f, 1 from unnest(${unique}::text[]) as f
      on conflict (env, day, field) do update set n = daily_counts.n + 1`;
  } catch (e) {
    console.error("count failed:", e instanceof Error ? e.message : e);
  }
}

/** Add `amount` to one field for today (the digest's sent and failed counts). */
export async function add(field: string, amount: number, env = statsEnv()) {
  if (!amount) return;
  try {
    await sql()`
      insert into daily_counts (env, day, field, n) values (${env}, ${tallinnDay()}::date, ${field}, ${amount})
      on conflict (env, day, field) do update set n = daily_counts.n + excluded.n`;
  } catch (e) {
    console.error("add failed:", e instanceof Error ? e.message : e);
  }
}

/** Keep the highest value seen today for a field (the snake's best score). */
export async function best(field: string, value: number, env = statsEnv()) {
  try {
    await sql()`
      insert into daily_counts (env, day, field, n) values (${env}, ${tallinnDay()}::date, ${field}, ${value})
      on conflict (env, day, field) do update set n = greatest(daily_counts.n, excluded.n)`;
  } catch (e) {
    console.error("best failed:", e instanceof Error ? e.message : e);
  }
}

export interface CountRow {
  day: string;
  field: string;
  n: number;
}

/** Every counter from `days` days ago (Tallinn) to today. */
export async function readCounts(days: number, env = statsEnv()): Promise<CountRow[]> {
  const from = tallinnDay(new Date(Date.now() - (days - 1) * 86_400_000));
  const rows = (await sql()`select to_char(day, 'YYYY-MM-DD') as day, field, n from daily_counts where env = ${env} and day >= ${from}::date order by day`) as {
    day: string;
    field: string;
    n: string | number;
  }[];
  return rows.map((r) => ({ ...r, n: Number(r.n) }));
}

/* ---------- Request filters, as on ragne.me (src/lib/page-views.ts, page-stats.ts) ---------- */

/** Crawlers, link-preview fetchers, monitors and scripted clients. A real browser's user agent contains none of these. */
const BOT_UA =
  /bot|crawl|spider|slurp|archiver|preview|fetcher|facebookexternalhit|meta-externalagent|embedly|whatsapp|telegram|discord|slack|skype|vkshare|pinterest|quora|outbrain|bitly|headless|phantom|puppeteer|playwright|selenium|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|statuscake|curl|wget|httpie|python|java\/|okhttp|go-http|node-fetch|undici|axios|libwww|scrapy|vercel/i;

export function isBotRequest(headers: Headers): boolean {
  const ua = headers.get("user-agent") ?? "";
  if (!ua.trim() || BOT_UA.test(ua)) return true;
  const purpose = [headers.get("sec-purpose"), headers.get("purpose"), headers.get("x-purpose"), headers.get("x-moz")].join(" ").toLowerCase();
  return /prefetch|prerender|preview/.test(purpose);
}

/** A referrer's hostname, "direct" for none, or null for this site itself or anything that is not a bare hostname. */
export function referrerName(raw: unknown): string | null {
  if (raw === "") return "direct";
  if (typeof raw !== "string" || raw.length > 64) return null;
  const host = raw.toLowerCase().replace(/^www\./, "");
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host)) return null;
  if (host === "ping.ragne.me" || host.endsWith(".vercel.app") || host === "localhost") return null;
  return host;
}

/** Vercel's country header: two capitals or nothing. */
export function countryCode(headers: Headers): string | null {
  const code = headers.get("x-vercel-ip-country") ?? "";
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

/** "m" (phone) or "d" (desktop). The user agent is looked at here and not kept. */
export function deviceLetter(headers: Headers): "m" | "d" {
  if (headers.get("sec-ch-ua-mobile") === "?1") return "m";
  return /mobi|android|iphone|ipod/i.test(headers.get("user-agent") ?? "") ? "m" : "d";
}
