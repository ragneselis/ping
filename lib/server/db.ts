/**
 * Neon Postgres (connected through the Vercel Marketplace, so DATABASE_URL is set in Vercel).
 * Server only: API routes and scripts. Queries go over HTTP, so nothing holds a connection open.
 *
 * subscribers keeps only what the feature needs: email, preferences, frequency, whether the address is
 * confirmed, a random token for the manage and unsubscribe links, and two timestamps. Unsubscribing
 * deletes the row.
 *
 * rate_limits holds a salted hash of the visitor's IP address with a counter, for at most an hour,
 * so the sign-up form cannot be used to flood inboxes. It is never linked to a subscriber.
 */
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { createHash, randomBytes } from "node:crypto";
import type { Frequency, Prefs } from "@/lib/subscription";

let client: NeonQueryFunction<false, false> | null = null;
export function sql() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    client = neon(url);
  }
  return client;
}

export const SCHEMA = [
  `create table if not exists subscribers (
    id bigint generated always as identity primary key,
    email text not null unique,
    preferences jsonb not null,
    frequency text not null check (frequency in ('weekly', 'daily')),
    confirmed boolean not null default false,
    token text not null unique,
    created_at timestamptz not null default now(),
    last_sent_at timestamptz
  )`,
  // Anonymous usage stats (lib/usage.ts): one counter per field per Tallinn day, kept apart for
  // production ("prod") and local or preview runs ("dev"), so testing never moves the real numbers.
  `create table if not exists daily_counts (
    env text not null,
    day date not null,
    field text not null,
    n bigint not null default 0,
    primary key (env, day, field)
  )`,
  `create table if not exists rate_limits (
    key text primary key,
    hits integer not null,
    window_start timestamptz not null
  )`,
];

export interface Subscriber {
  id: number;
  email: string;
  preferences: Prefs;
  frequency: Frequency;
  confirmed: boolean;
  token: string;
  created_at: string;
  last_sent_at: string | null;
}

/** 32 random bytes, URL-safe: the only key to a subscriber's manage and unsubscribe links. */
export const newToken = () => randomBytes(32).toString("base64url");

/** Salted with a server secret, so a stored hash cannot be turned back into an IP address. */
export function hashKey(value: string) {
  return createHash("sha256")
    .update(`${process.env.DATABASE_URL ?? ""}|ping-rate|${value}`)
    .digest("base64url");
}

/** True when `key` has already used up `limit` in the current window (does not count this call). */
export async function blocked(key: string, limit: number, windowMinutes = 60): Promise<boolean> {
  const rows = (await sql()`select hits from rate_limits where key = ${hashKey(key)} and window_start >= now() - make_interval(mins => ${windowMinutes})`) as { hits: number }[];
  return (rows[0]?.hits ?? 0) >= limit;
}

/**
 * Fixed-window limit: at most `limit` requests per `windowMinutes` for one key. Old windows are
 * deleted as it goes, so nothing lasts longer than the window.
 */
export async function allow(key: string, limit: number, windowMinutes = 60): Promise<boolean> {
  const db = sql();
  const k = hashKey(key);
  await db`delete from rate_limits where window_start < now() - make_interval(mins => ${windowMinutes})`;
  const rows = (await db`
    insert into rate_limits (key, hits, window_start) values (${k}, 1, now())
    on conflict (key) do update set hits = rate_limits.hits + 1
    returning hits`) as { hits: number }[];
  return rows[0].hits <= limit;
}
