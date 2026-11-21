"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, type ComponentProps } from "react";
import { track } from "@/components/usage-beacon";
import { FILTER_VALUES } from "@/lib/usage";
import { consumeRestored, rememberView } from "@/lib/view-memory";

/*
 * Links that set Jobs filters land on the results, not at the top of the page.
 *
 * FilterLink: use it for every link that sets filters (readouts, "Show me those", the empty state,
 * the direction links on Market insights). It navigates without Next.js's jump to the top and flags
 * that the results should come into view; if the URL is already the same, it scrolls at once.
 *
 * ResultsTarget: mounted once on the Jobs page. After a FilterLink navigation, and when the page is
 * opened straight from a filtered URL (a shared link, an email digest), it scrolls to the results
 * heading ("Find your direction") clear of the sticky header (the heading's scroll-margin), smoothly or
 * instantly under prefers-reduced-motion, and moves keyboard focus to it so screen readers land there.
 */

/** The heading the results scroll to: it needs tabIndex={-1} and a scroll margin for the sticky header. */
export const RESULTS_ID = "jobs-heading";

/** Query parameters that are filters (a plain sort or "load more" page is not). */
const FILTER_PARAMS = ["category", "estonia", "level", "reach", "remote", "q", "company"];

let pending = false;

export function scrollToResults() {
  const heading = document.getElementById(RESULTS_ID);
  if (!heading) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  heading.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  heading.focus({ preventScroll: true });
}

export function FilterLink({ onClick, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      scroll={false}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const target = new URL(String(props.href), window.location.href);
        // Anonymous usage stats: the filters this link sets count as chosen.
        target.searchParams.forEach((value, key) => {
          if (FILTER_VALUES[key]) for (const v of value.split(",")) track({ name: "filter", filter: key, value: v });
        });
        // A link to Jobs is a view the visitor chose: remember it ("/" alone clears the memory).
        if (target.pathname === "/") rememberView(target.search);
        const here = target.pathname === window.location.pathname && target.search === window.location.search;
        if (here) scrollToResults();
        else pending = true;
      }}
    />
  );
}

export function ResultsTarget() {
  const params = useSearchParams();
  const first = useRef(true);
  useEffect(() => {
    // A view restored from the visitor's memory (lib/view-memory.ts) is not a shared link: no scroll.
    const opened = first.current && FILTER_PARAMS.some((k) => params.has(k)) && !consumeRestored();
    first.current = false;
    if (!pending && !opened) return;
    pending = false;
    // After the new results have painted.
    requestAnimationFrame(() => scrollToResults());
  }, [params]);
  return null;
}
