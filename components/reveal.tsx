"use client";

import { useEffect } from "react";

/**
 * Scroll reveal for the whole page, once per element. Anything marked data-reveal (panels, chart
 * panels, the first screen of job rows) gets data-revealed when it first enters the viewport; the CSS
 * in globals.css does the rest (a short rise and fade, staggered by --reveal-i, and chart bars
 * growing). Elements added later (filter changes, "Load more") are picked up by a MutationObserver.
 * Under prefers-reduced-motion the CSS never hides anything, and everything is marked revealed at once.
 */
export function RevealObserver() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.revealed = "";
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 },
    );
    const track = (root: ParentNode) => {
      root.querySelectorAll<HTMLElement>("[data-reveal]:not([data-revealed])").forEach((el) => {
        if (reduced) el.dataset.revealed = "";
        else io.observe(el);
      });
    };
    track(document);
    const mo = new MutationObserver((records) => {
      for (const r of records)
        r.addedNodes.forEach((n) => {
          if (!(n instanceof HTMLElement)) return;
          if (n.matches("[data-reveal]:not([data-revealed])")) (reduced ? (n.dataset.revealed = "") : io.observe(n));
          track(n);
        });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    // Safety net: content must never stay hidden. Anything on screen that has not been revealed
    // after 3s (for example when no frames are being painted) is shown as is.
    const fallback = setTimeout(() => {
      document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-revealed])").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight) el.dataset.revealed = "";
      });
    }, 3000);
    return () => {
      io.disconnect();
      mo.disconnect();
      clearTimeout(fallback);
    };
  }, []);
  return null;
}
