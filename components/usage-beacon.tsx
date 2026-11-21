"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { UsageEvent } from "@/lib/usage";

/*
 * The browser's half of Ping's anonymous usage stats (lib/usage.ts), on ragne.me's method
 * (its src/components/view-beacon.tsx). Mounted once in the root layout; renders nothing.
 *
 * VIEWS: one per page shown, on load and on every route change. Not counted: a page still being
 * prerendered (counted when shown), a webdriver, and the same page again in the same browser within
 * 30 minutes (a reload, or back to it). The time of the last counted view per page is kept in
 * localStorage: a time and a path, in the visitor's own browser, read by nothing but this.
 *
 * VISITORS: a browser counts once per Tallinn day. The day it was last counted is kept in
 * localStorage beside the view times. No cookie, no identifier: nothing is sent that could tell one
 * browser from another. With storage blocked every view counts and no visitor does.
 *
 * REFERRER: the hostname only, with the first view of a document ("" for none).
 *
 * EVENTS: `track()` sends one usage event (a job opened, a filter, a search, the subscription
 * modal, the snake). Job clicks are picked up here from [data-job-id] links, so the job list stays
 * server-rendered. Searches are sent once typing has paused for 1.5s.
 *
 * Local runs send too, but the server files them under "dev", apart from the real numbers.
 */

const WINDOW_MS = 30 * 60 * 1000;
const VIEWS_KEY = "ping-views";
const DAY_KEY = "ping-visitor-day";

const tallinnDay = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Tallinn" }).format(new Date());

function post(body: object) {
  if (typeof navigator !== "undefined" && navigator.webdriver) return;
  fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), keepalive: true }).catch(() => {});
}

export function track(event: UsageEvent) {
  post({ kind: "event", event });
}

let searchTimer: ReturnType<typeof setTimeout> | null = null;
/** A search, sent once typing has paused, so "des", "desi", "design" count as one search for "design". */
export function trackSearch(q: string) {
  if (searchTimer) clearTimeout(searchTimer);
  if (!q.trim()) return;
  searchTimer = setTimeout(() => track({ name: "search", q }), 1500);
}

function firstToday(): boolean {
  try {
    const today = tallinnDay();
    if (localStorage.getItem(DAY_KEY) === today) return false;
    localStorage.setItem(DAY_KEY, today);
    return true;
  } catch {
    return false;
  }
}

function seenRecently(path: string, now: number): boolean {
  try {
    const last: Record<string, number> = JSON.parse(localStorage.getItem(VIEWS_KEY) ?? "{}");
    if (now - (last[path] ?? 0) < WINDOW_MS) return true;
    for (const p of Object.keys(last)) if (now - last[p] >= WINDOW_MS) delete last[p];
    last[path] = now;
    localStorage.setItem(VIEWS_KEY, JSON.stringify(last));
  } catch {
    /* Storage blocked: count. */
  }
  return false;
}

let landing = true;
function referrerHost(): string | undefined {
  if (!landing) return undefined;
  landing = false;
  if (!document.referrer) return "";
  try {
    const host = new URL(document.referrer).hostname;
    return host === location.hostname ? undefined : host;
  } catch {
    return undefined;
  }
}

function sendView(path: string) {
  if (navigator.webdriver) return;
  const visitor = firstToday();
  const view = !seenRecently(path, Date.now());
  const referrer = referrerHost();
  if (!view && !visitor) return;
  post({ kind: "view", path, view, visitor, referrer });
}

export function UsageBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    const doc = document as Document & { prerendering?: boolean };
    if (!doc.prerendering) {
      sendView(pathname);
      return;
    }
    const onShown = () => sendView(pathname);
    doc.addEventListener("prerenderingchange", onShown, { once: true });
    return () => doc.removeEventListener("prerenderingchange", onShown);
  }, [pathname]);

  // Job postings opened from the list (middle and modified clicks too).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest<HTMLAnchorElement>("a[data-job-id]");
      if (a?.dataset.jobId && a.dataset.jobCategory) track({ name: "job", id: a.dataset.jobId, category: a.dataset.jobCategory });
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
    };
  }, []);

  return null;
}
