"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Horizontally scrolling chip row on narrow screens (wraps from md up). Keeps the active chip
 * (aria-pressed or aria-current) in view, so a selected filter is never hidden off-screen.
 */
export function ChipScroller({ children, className, activeKey, ...rest }: { children: ReactNode; className?: string; activeKey?: string; "aria-label"?: string; as?: "div" | "nav" }) {
  const ref = useRef<HTMLDivElement>(null);
  // Fade the right edge while more chips sit off-screen, so the row reads as scrollable.
  const [more, setMore] = useState(false);
  useLayoutEffect(() => {
    const row = ref.current;
    if (!row) return;
    const update = () => setMore(row.scrollWidth - row.clientWidth - row.scrollLeft > 4);
    update();
    row.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(row);
    return () => {
      row.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);
  useLayoutEffect(() => {
    const row = ref.current;
    const active = row?.querySelector<HTMLElement>('[aria-pressed="true"], [aria-current="page"]');
    if (!row || !active || row.scrollWidth <= row.clientWidth) return;
    const left = active.offsetLeft - (row.clientWidth - active.offsetWidth) / 2;
    row.scrollTo({ left: Math.max(0, left) });
  }, [activeKey]);
  const Tag = rest.as ?? "div";
  return (
    <Tag
      ref={ref}
      aria-label={rest["aria-label"]}
      className={cn(
        "relative -mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:overflow-visible md:px-0",
        more && "mask-[linear-gradient(to_right,black_80%,transparent)] md:mask-none",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
