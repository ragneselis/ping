/**
 * Everything /stats shows, read in one place. Server only; only app/stats/page.tsx calls it (behind
 * the password, see middleware.ts).
 */
import { CATEGORY_META } from "@/lib/categories";
import { loadClassifications, loadCompanies, loadDiscovery, loadExtractions, loadRun, loadSources } from "@/lib/data";
import { LEVEL_VALUES, type Frequency, type Prefs } from "@/lib/subscription";
import { CATEGORIES, type Category } from "@/lib/types";
import { companyName, getDataset } from "@/lib/view";
import { sql } from "./db";
import { loadSeen } from "./digest";
import { readCounts, statsEnv, tallinnDay, type CountRow } from "./usage";
import { LATE_AFTER_MINUTES, MISSED_AFTER_HOURS, TRIGGER_LABEL, dueOn, isRunDay, lastRunDue, tallinnDay as runDay, type RunRecord } from "@/lib/schedule";

const REPO = "ragneselis/ping";

const dayOffset = (days: number) => tallinnDay(new Date(Date.now() - days * 86_400_000));

/** Sum of a field (or of every field with a prefix, keyed by the rest) over the days from `from` on. */
function sum(rows: CountRow[], field: string, from = "") {
  return rows.filter((r) => r.field === field && r.day >= from).reduce((n, r) => n + r.n, 0);
}
function byPrefix(rows: CountRow[], prefix: string, from = "") {
  const out = new Map<string, number>();
  for (const r of rows) if (r.field.startsWith(prefix) && r.day >= from) out.set(r.field.slice(prefix.length), (out.get(r.field.slice(prefix.length)) ?? 0) + r.n);
  return [...out.entries()].map(([key, n]) => ({ key, n })).sort((a, b) => b.n - a.n || a.key.localeCompare(b.key));
}

/** The Monday (Tallinn date) of the week a day falls in. */
function weekOf(day: string) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

const country = new Intl.DisplayNames(["en-GB"], { type: "region" });
const countryName = (code: string) => {
  try {
    return country.of(code) ?? code;
  } catch {
    return code;
  }
};

const PAGE_NAME: Record<string, string> = { "/": "Jobs", "/discover": "Discover", "/insights": "Market insights", "/privacy": "Privacy" };
const LEVEL_NAME: Record<string, string> = { reach: "Within reach", mid: "Mid", senior: "Senior" };
const FILTER_NAME: Record<string, string> = { category: "Direction", level: "Level", estonia: "Location", remote: "Work setup", sort: "Sort" };
const filterValueName = (filter: string, value: string) =>
  filter === "category"
    ? CATEGORY_META[value as Category]?.short ?? value
    : filter === "level"
      ? LEVEL_NAME[value] ?? value
      : filter === "estonia"
        ? "Open to Estonia"
        : filter === "remote"
          ? { remote: "Remote", hybrid: "Hybrid", onsite: "On-site" }[value] ?? value
          : value === "newest"
            ? "Newest"
            : value === "roles"
              ? "Most roles (Discover)"
              : "Best fit first";

export interface SubscriberRow {
  id: number;
  email: string;
  preferences: Prefs;
  frequency: Frequency;
  confirmed: boolean;
  created_at: string;
  last_sent_at: string | null;
}

interface WorkflowRun {
  conclusion: string | null;
  status: string;
  createdAt: string;
  url: string;
}

/** The latest runs of the refresh workflow, from GitHub's public API (the repository is public). Cached 5 minutes. */
async function latestRuns(): Promise<WorkflowRun[] | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/refresh.yml/runs?per_page=5`, {
      headers: { accept: "application/vnd.github+json", "user-agent": "ping-stats" },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { workflow_runs: { conclusion: string | null; status: string; created_at: string; html_url: string }[] };
    return body.workflow_runs.map((r) => ({ conclusion: r.conclusion, status: r.status, createdAt: r.created_at, url: r.html_url }));
  } catch {
    return null;
  }
}

export async function readStats() {
  const env = statsEnv();
  const [rows, subscribers, runs] = await Promise.all([
    readCounts(70, env),
    sql()`select id, email, preferences, frequency, confirmed, created_at, last_sent_at from subscribers order by created_at desc`.then((r) => r as SubscriberRow[]),
    latestRuns(),
  ]);
  const today = tallinnDay();
  const d7 = dayOffset(6);
  const d30 = dayOffset(29);

  /* ---------- Visitors ---------- */
  const days30 = Array.from({ length: 30 }, (_, i) => dayOffset(29 - i));
  const visitors = {
    today: { visitors: sum(rows, "u", today), views: sum(rows, "v", today) },
    week: { visitors: sum(rows, "u", d7), views: sum(rows, "v", d7) },
    month: { visitors: sum(rows, "u", d30), views: sum(rows, "v", d30) },
    daily: days30.map((day) => ({ day, visitors: sum(rows.filter((r) => r.day === day), "u"), views: sum(rows.filter((r) => r.day === day), "v") })),
    pages: byPrefix(rows, "v:", d30).map((p) => ({ label: PAGE_NAME[p.key] ?? p.key, n: p.n })),
    referrers: byPrefix(rows, "r:", d30).map((p) => ({ label: p.key === "direct" ? "Direct or unknown" : p.key, n: p.n })),
    countries: byPrefix(rows, "c:", d30).map((p) => ({ label: countryName(p.key), n: p.n })),
    devices: [
      { label: "Phone", n: sum(rows, "d:m", d30) },
      { label: "Desktop", n: sum(rows, "d:d", d30) },
    ],
  };

  /* ---------- Subscribers ---------- */
  const weeks = Array.from({ length: 8 }, (_, i) => weekOf(dayOffset((7 - i) * 7)));
  const prefsOf = subscribers.map((s) => s.preferences);
  const subs = {
    confirmed: subscribers.filter((s) => s.confirmed).length,
    waiting: subscribers.filter((s) => !s.confirmed).length,
    twice: subscribers.filter((s) => s.confirmed && s.frequency !== "weekly").length,
    weekly: subscribers.filter((s) => s.confirmed && s.frequency === "weekly").length,
    weeks: weeks.map((week) => ({
      week,
      signups: rows.filter((r) => r.field === "sub:signup" && weekOf(r.day) === week).reduce((n, r) => n + r.n, 0),
      confirms: rows.filter((r) => r.field === "sub:confirm" && weekOf(r.day) === week).reduce((n, r) => n + r.n, 0),
      unsubs: rows.filter((r) => r.field === "sub:unsub" && weekOf(r.day) === week).reduce((n, r) => n + r.n, 0),
    })),
    directions: [
      { label: "All directions", n: prefsOf.filter((p) => !p.categories?.length).length },
      ...CATEGORIES.map((c) => ({ label: CATEGORY_META[c].short, n: prefsOf.filter((p) => p.categories?.includes(c)).length })),
    ]
      .filter((r) => r.n > 0)
      .sort((a, b) => b.n - a.n),
    levels: [
      { label: "Any level", n: prefsOf.filter((p) => !p.levels?.length).length },
      ...LEVEL_VALUES.map((l) => ({ label: LEVEL_NAME[l], n: prefsOf.filter((p) => p.levels?.includes(l)).length })),
    ].filter((r) => r.n > 0),
    estonia: prefsOf.filter((p) => p.estonia).length,
    total: subscribers.length,
    list: subscribers,
  };

  /* ---------- What people use (30 days) ---------- */
  const { cards } = getDataset();
  const byId = new Map(cards.map((c) => [c.id, c]));
  const usage = {
    jobs: byPrefix(rows, "job:", d30)
      .slice(0, 10)
      .map((j) => {
        const card = byId.get(j.key);
        return { label: card ? `${card.title}, ${card.company}` : "A posting no longer listed", n: j.n, url: card?.url };
      }),
    jobClicks: byPrefix(rows, "jobcat:", d30).reduce((n, j) => n + j.n, 0),
    directions: byPrefix(rows, "jobcat:", d30).map((c) => ({ label: CATEGORY_META[c.key as Category]?.short ?? c.key, n: c.n })),
    filters: byPrefix(rows, "f:", d30)
      .slice(0, 12)
      .map((f) => {
        const [filter, value] = f.key.split(":");
        return { label: `${FILTER_NAME[filter] ?? filter}: ${filterValueName(filter, value)}`, n: f.n };
      }),
    searches: byPrefix(rows, "q:", d30).slice(0, 12).map((q) => ({ label: q.key, n: q.n })),
    companies: byPrefix(rows, "co:", d30)
      .slice(0, 10)
      .map((c) => ({ label: companyName(c.key) ?? c.key, n: c.n, url: `/?company=${c.key}` })),
    funnel: {
      opened: sum(rows, "m:open", d30),
      sent: sum(rows, "m:sent", d30),
      signups: sum(rows, "sub:signup", d30),
      confirmed: sum(rows, "sub:confirm", d30),
    },
    snake: {
      games: sum(rows, "g:play", d30),
      gamesAll: sum(rows, "g:play"),
      best: Math.max(0, ...rows.filter((r) => r.field === "g:best").map((r) => r.n)),
    },
  };

  /* ---------- Pipeline ---------- */
  const run = loadRun();
  const sources = loadSources();
  const lastRun = run?.lastRun ?? sources?.fetchedAt ?? null;
  const fetchedAt = sources?.fetchedAt ?? null;
  // Model runs of the last refresh: between its fetch and its stamp.
  const inLastRun = (at: string) => !!fetchedAt && !!lastRun && at >= fetchedAt && at <= new Date(new Date(lastRun).getTime() + 60_000).toISOString();
  const modelRuns = [...loadClassifications().runs, ...loadExtractions().runs].filter((r) => inLastRun(r.at));
  const stamp = lastRun ? lastRun.replace(/\.\d{3}Z$/, "Z") : null;
  const seen = loadSeen();
  const latest = runs?.[0] ?? null;
  const lastFinished = runs?.find((r) => r.status === "completed") ?? null;
  const ageHours = lastRun ? (Date.now() - new Date(lastRun).getTime()) / 3_600_000 : Infinity;
  const days14 = Array.from({ length: 14 }, (_, i) => dayOffset(13 - i));
  const pipeline = {
    lastRun,
    nextRun: run?.nextRun ?? null,
    ageHours,
    // Stale: the latest Monday or Thursday run is more than MISSED_AFTER_HOURS overdue (days without a
    // scheduled run never count).
    overdue: (() => {
      const due = lastRunDue(new Date(Date.now() - MISSED_AFTER_HOURS * 3_600_000));
      return !lastRun || new Date(lastRun) < due ? due.toISOString() : null;
    })(),
    failed: lastFinished?.conclusion === "failure",
    workflow: latest,
    lastFinished,
    workflowKnown: runs !== null,
    fetched: sources ? { inScope: sources.totalInScope, unique: sources.unique, sources: sources.sources.length } : null,
    newPostings: stamp ? Object.values(seen).filter((t) => t === stamp).length : null,
    failedSources: run?.failedSources ?? sources?.sources.filter((s) => !s.ok).map((s) => s.source) ?? [],
    costUsd: modelRuns.reduce((n, r) => n + r.costUsd, 0),
    classified: modelRuns.filter((r) => r.note?.startsWith("classification")).reduce((n, r) => n + r.postings, 0),
    // One row per run day (Monday and Thursday) and per other day that had a run (manual): the run that
    // day (the first, if several), which trigger started it, and whether it was on time, late (a backup or
    // late start) or missed. Days without a scheduled run are left out unless something ran, so they
    // never show as missed. Days before run history was kept (run.json's history began 2026-11-22) say
    // "not recorded".
    runs: (() => {
      const history: RunRecord[] = run?.history ?? (run?.lastRun ? [{ at: run.lastRun, trigger: run.trigger ?? "manual" }] : []);
      const first = history[0]?.at ?? null;
      const ranOn = (day: string) => history.find((h) => runDay(new Date(h.startedAt ?? h.at)) === day) ?? null;
      return days14.filter((day) => isRunDay(day) || ranOn(day)).map((day) => {
        const r = ranOn(day);
        const due = dueOn(day);
        const pastDue = Date.now() > due.getTime() + MISSED_AFTER_HOURS * 3_600_000;
        const started = r ? new Date(r.startedAt ?? r.at) : null;
        // A run on a day without a scheduled one: "manual" when started by hand, else "extra" (the
        // daily runs from before the Monday and Thursday rhythm).
        const status = r
          ? r.trigger === "manual"
            ? "manual"
            : !isRunDay(day)
              ? "extra"
              : r.trigger === "schedule" && started!.getTime() <= due.getTime() + LATE_AFTER_MINUTES * 60_000
                ? "on time"
                : "late"
          : !first || day < runDay(new Date(first))
            ? "not recorded"
            : pastDue
              ? "missed"
              : "not due yet";
        return { day, trigger: r ? TRIGGER_LABEL[r.trigger] : null, started: started?.toISOString() ?? null, status };
      });
    })(),
    digests: days14.map((day) => ({
      day,
      sent: sum(rows.filter((r) => r.day === day), "digest:sent"),
      failed: sum(rows.filter((r) => r.day === day), "digest:failed"),
    })),
  };

  /* ---------- Weekly discovery ---------- */
  const discoveryRuns = loadDiscovery();
  const companies = loadCompanies();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const discovery = {
    latest: discoveryRuns.at(-1) ?? null,
    tracked: companies.length,
    basedInEstonia: companies.filter((c) => c.basedInEstonia).length,
    inEstonia: companies.filter((c) => c.inEstonia).length,
    linkOnly: companies.filter((c) => c.careersLinkOnly).length,
    byDiscovery: companies.filter((c) => c.addedBy === "discovery").length,
    addedThisWeek: companies.filter((c) => c.addedBy === "discovery" && c.addedAt >= weekAgo),
    costAll: discoveryRuns.reduce((total, r) => total + r.costUsd, 0),
  };

  return { env, today, visitors, subs, usage, pipeline, discovery };
}

export type Stats = Awaited<ReturnType<typeof readStats>>;
