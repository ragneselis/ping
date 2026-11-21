/**
 * Email subscriptions: the preferences a subscriber picks in the "Get new jobs" modal, shared by the
 * modal (client), the API routes and the digest script. Preferences mirror the Jobs page filters, so
 * a digest's "see the rest" link opens exactly the same view.
 */
import { z } from "zod";
import { CATEGORIES, type Category } from "./types";

export const LEVEL_VALUES = ["reach", "mid", "senior"] as const;
export const REMOTE_VALUES = ["remote", "hybrid", "onsite"] as const;
export const FREQUENCIES = ["weekly", "daily"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

/** At most this many jobs in one email; the rest are a link away. */
export const DIGEST_CAP = 10;

export const PrefsSchema = z.object({
  /** Directions; empty means every direction. */
  categories: z.array(z.enum(CATEGORIES)).max(CATEGORIES.length),
  /** Level buckets; empty means every level. */
  levels: z.array(z.enum(LEVEL_VALUES)).max(LEVEL_VALUES.length),
  /** Only roles someone based in Estonia can apply for. */
  estonia: z.boolean(),
  /** Work setup; empty means any. */
  remote: z.enum(["", "remote", "hybrid", "onsite"]),
});
export type Prefs = z.infer<typeof PrefsSchema>;

export const EMPTY_PREFS: Prefs = { categories: [], levels: [], estonia: false, remote: "" };

/** Practical email check, the same in the modal and on the server. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
export const isEmail = (s: string) => s.length <= 254 && EMAIL_PATTERN.test(s);

export const SubscribeSchema = z.object({
  email: z.string().trim().toLowerCase().refine(isEmail, "Enter a valid email address."),
  prefs: PrefsSchema,
  frequency: z.enum(FREQUENCIES),
  /** Honeypot: a hidden field people never see. Anything in it marks the request as a bot. */
  website: z.string().optional(),
});

export const ManageSchema = z.object({ token: z.string().min(20).max(80), prefs: PrefsSchema, frequency: z.enum(FREQUENCIES) });

/** Normalise a set of values to their canonical order, so stored preferences compare equal. */
const ordered = <T extends string>(all: readonly T[], picked: readonly T[]) => all.filter((v) => picked.includes(v));
export const normalisePrefs = (p: Prefs): Prefs => ({
  categories: ordered(CATEGORIES, p.categories),
  levels: ordered(LEVEL_VALUES, p.levels),
  estonia: p.estonia,
  remote: p.remote,
});

/** Jobs page query for these preferences (?category=product,game&level=reach&estonia=1&remote=remote). */
export function prefsToQuery(p: Prefs): string {
  const q = new URLSearchParams();
  if (p.categories.length && p.categories.length < CATEGORIES.length) q.set("category", ordered(CATEGORIES, p.categories).join(","));
  if (p.levels.length && p.levels.length < LEVEL_VALUES.length) q.set("level", ordered(LEVEL_VALUES, p.levels).join(","));
  if (p.estonia) q.set("estonia", "1");
  if (p.remote) q.set("remote", p.remote);
  // Commas are safe in a query string; keep them readable (?category=product,game).
  return q.toString().replace(/%2C/g, ",");
}

/** Preferences from a Jobs page query string, so the modal opens with the visitor's current filters. */
export function prefsFromQuery(search: string): Prefs {
  const q = new URLSearchParams(search);
  const list = (k: string) => (q.get(k) ?? "").split(",").filter(Boolean);
  const levels = new Set(list("level"));
  if (q.get("reach") === "1") levels.add("reach");
  const remote = q.get("remote") ?? "";
  return {
    categories: ordered(CATEGORIES, list("category") as Category[]),
    levels: ordered(LEVEL_VALUES, [...levels] as (typeof LEVEL_VALUES)[number][]),
    estonia: q.get("estonia") === "1",
    remote: (REMOTE_VALUES as readonly string[]).includes(remote) ? (remote as Prefs["remote"]) : "",
  };
}
