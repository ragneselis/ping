"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";

/**
 * Read and write the page's URL query (filters and sort live there, so views can be shared).
 * Keeps the latest query in a ref, so quick successive changes build on each other instead of
 * on a stale URL. Every change resets "load more".
 */
export function useQueryState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const query = useRef(params.toString());
  useEffect(() => {
    query.current = params.toString();
  }, [params]);

  const go = (qs: string) => {
    query.current = qs;
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(query.current);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    go(next.toString());
  };
  return { params, pending, go, update, set: (key: string, value: string | null) => update({ [key]: value }) };
}
