"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { sound } from "@/lib/sound";

/**
 * The job list's cross-fade. While a filter change is loading, the list dims (html[data-pending], set by
 * useQueryState); when the new results arrive, they fade up from that dimmed state instead of jumping,
 * with a quiet tick. `signature` is the filter state, so "Load more" (only the page changes) neither
 * fades nor ticks. Under prefers-reduced-motion the list just swaps.
 */
export function ResultsFade({ signature, children }: { signature: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const previous = useRef(signature);
  useEffect(() => {
    if (previous.current === signature) return;
    previous.current = signature;
    sound.results();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    ref.current?.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 240, easing: "cubic-bezier(0.23, 1, 0.32, 1)" });
  }, [signature]);
  return (
    <div ref={ref} data-results="">
      {children}
    </div>
  );
}
