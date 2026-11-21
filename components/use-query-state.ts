"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { track, trackSearch } from "@/components/usage-beacon";
import { FILTER_VALUES } from "@/lib/usage";
import { rememberView } from "@/lib/view-memory";

/**
 * Read and write the page's URL query (filters and sort live there, so views can be shared).
 * Keeps the latest query in a ref, so quick successive changes build on each other instead of
 * on a stale URL. Every change resets "load more", and on Jobs it is remembered as the visitor's view
 * (lib/view-memory.ts).
 */
export function useQueryState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  // Marks the page while new results load, so the job list can dim (see components/results-fade.tsx).
  useEffect(() => {
    if (pending) document.documentElement.setAttribute("data-pending", "");
    else document.documentElement.removeAttribute("data-pending");
  }, [pending]);
  const query = useRef(params.toString());
  useEffect(() => {
    query.current = params.toString();
  }, [params]);

  const go = (qs: string) => {
    query.current = qs;
    if (pathname === "/") rememberView(qs);
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(query.current);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
      // Anonymous usage stats: which filters are picked (a level list counts each level), and searches.
      if (k === "q" && v) trackSearch(v);
      else if (v && FILTER_VALUES[k]) for (const value of v.split(",")) track({ name: "filter", filter: k, value });
    }
    next.delete("page");
    go(next.toString());
  };
  return { params, pending, go, update, set: (key: string, value: string | null) => update({ [key]: value }) };
}
