"use client";

import { useEffect, useRef, useState } from "react";
import { sound } from "@/lib/sound";

const DURATION = 720;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * A readout figure that counts up from zero to its value once, the first time it comes into view.
 * Works on the displayed text: the leading number counts ("1,271", "13%", "5 yrs", "8 of 76") and the
 * rest stays as written; anything without a leading number ("n/a") just shows. Until the count starts
 * the figure is hidden by CSS (so the final value never flashes first); under prefers-reduced-motion it
 * shows its final value at once. When the count lands, one soft "settle" ping (passive: only if audio
 * is already running, never on page load).
 */
export function CountUp({ value }: { value: string }) {
  const match = /^(\d[\d,]*)(.*)$/.exec(value);
  const target = match ? Number(match[1].replace(/,/g, "")) : null;
  const grouped = match ? match[1].includes(",") : false;
  const rest = match ? match[2] : "";
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState<string>(value);
  const [state, setState] = useState<"waiting" | "counting" | "done">("waiting");

  useEffect(() => {
    const el = ref.current;
    if (!el || target === null || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setState("done");
      return;
    }
    const fmt = (n: number) => (grouped ? n.toLocaleString("en-GB") : String(n)) + rest;
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        setShown(fmt(0));
        setState("counting");
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / DURATION);
          setShown(fmt(Math.round(target * easeOut(t))));
          if (t < 1) raf = requestAnimationFrame(step);
          else {
            setShown(value);
            setState("done");
            sound.settle();
          }
        };
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    // Safety net: a figure must never stay invisible. If it is on screen and has not started
    // counting after 2.5s (no frames being painted), show the final value as is.
    const fallback = setTimeout(() => {
      const r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) {
        io.disconnect();
        setState((s) => (s === "waiting" ? "done" : s));
      }
    }, 2500);
    return () => {
      io.disconnect();
      clearTimeout(fallback);
      cancelAnimationFrame(raf);
    };
  }, [value, target, grouped, rest]);

  return (
    <span ref={ref} data-count={state}>
      {shown}
    </span>
  );
}
