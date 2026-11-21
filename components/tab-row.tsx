"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The shared row of direction tabs, used on Jobs and Market insights.
 * - From tablet width up the tabs wrap onto further lines, so every direction is always visible.
 *   Each line gets its own hairline: a background rule repeats every TAB_HEIGHT, and the active
 *   tab's underline sits on it.
 * - On phones the row scrolls sideways with scroll-snap, a fade on the right edge while more tabs
 *   sit off-screen, and the active tab kept in view.
 */
export function TabRow({
  children,
  label,
  activeKey,
  as = "div",
}: {
  children: ReactNode;
  label: string;
  activeKey?: string;
  as?: "div" | "nav";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  useLayoutEffect(() => {
    const row = ref.current;
    if (!row) return;
    const update = () =>
      setMore(row.scrollWidth - row.clientWidth - row.scrollLeft > 4);
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
    const active = row?.querySelector<HTMLElement>(
      '[aria-pressed="true"], [aria-current="page"]',
    );
    if (!row || !active || row.scrollWidth <= row.clientWidth) return;
    row.scrollTo({ left: Math.max(0, active.offsetLeft - 16) });
  }, [activeKey]);
  const Tag = as;
  return (
    <Tag
      ref={ref}
      aria-label={as === "nav" ? label : undefined}
      className={cn(
        "relative -mx-4 snap-x snap-mandatory scroll-px-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:snap-none md:overflow-visible md:px-0",
        more && "max-md:mask-[linear-gradient(to_right,black_80%,transparent)]",
      )}
    >
      <div
        role={as === "nav" ? undefined : "group"}
        aria-label={as === "nav" ? undefined : label}
        className="flex w-max min-w-full gap-x-6 bg-[linear-gradient(to_top,var(--color-border)_1px,transparent_1px)] bg-size-[100%_2.75rem] md:w-full md:flex-wrap"
      >
        {children}
      </div>
    </Tag>
  );
}
