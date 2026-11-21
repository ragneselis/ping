"use client";

import { useEffect } from "react";

const AWAY_TITLE = "Ping misses you";
const SLEEPING = { svg: "/favicon-sleeping.svg", png: "/favicon-sleeping.png" };

/**
 * "Ping misses you": while the tab is in the background, the title reads "Ping misses you" and the
 * favicon is the sleeping face (public/favicon-sleeping.*, from `npm run icons`). Coming back restores
 * the page's own title and the normal favicon at once. It reacts only to visibilitychange, so nothing
 * happens on first load, and it saves the title at the moment the tab is hidden, so each page gets its
 * own title back ("Market insights | Ping" stays "Market insights | Ping"). No sound, no animation.
 */
export function TabPresence() {
  useEffect(() => {
    let savedTitle: string | null = null;
    const saved = new Map<HTMLLinkElement, string>();

    const away = () => {
      if (savedTitle !== null) return;
      savedTitle = document.title;
      document.title = AWAY_TITLE;
      // Next.js renders one <link rel="icon"> per favicon file (SVG and PNGs); point each at the sleeping face.
      document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]').forEach((link) => {
        saved.set(link, link.getAttribute("href") ?? "");
        link.setAttribute("href", link.type === "image/svg+xml" ? SLEEPING.svg : SLEEPING.png);
      });
    };

    const back = () => {
      if (savedTitle === null) return;
      // Only put the title back if nothing else changed it meanwhile.
      if (document.title === AWAY_TITLE) document.title = savedTitle;
      savedTitle = null;
      saved.forEach((href, link) => link.setAttribute("href", href));
      saved.clear();
    };

    const onChange = () => (document.visibilityState === "hidden" ? away() : back());
    document.addEventListener("visibilitychange", onChange);
    return () => {
      document.removeEventListener("visibilitychange", onChange);
      back();
    };
  }, []);
  return null;
}
