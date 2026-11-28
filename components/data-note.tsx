"use client";

import { CalendarClock } from "lucide-react";
import { useEffect, useState } from "react";
import { IconText } from "@/components/icon-text";
import { lastTrip, nextTrip } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The hero's data note on Jobs, Discover and Market insights, in Ping's voice:
 * "Ping last went out on 26 November at 06:58 and found 1,281 roles. Next trip Monday at 06:00."
 * The first sentence is the last successful run (data/run.json), absolute, in Europe/Tallinn. The second
 * comes from the browser's clock in Tallinn time only (nextTrip in lib/format.ts): the next Monday or
 * Thursday at 06:00, a run day itself counting until 06:00. It is computed again when the page regains focus or becomes visible, so a tab
 * left open overnight reads right.
 */
export function DataNote({ lastRun, roles, className }: { lastRun: string | null; roles: number; className?: string }) {
  // null until mounted: the server's clock decides the first paint, then the browser's takes over.
  const [next, setNext] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setNext(nextTrip());
    update();
    const onVisible = () => document.visibilityState === "visible" && update();
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return (
    // The icon sits on the first line's capitals even when the sentence wraps (IconText). On phones 13px
    // and a 4px icon gap keep the note to two lines at 375px; from sm the usual 14px and 8px.
    <IconText as="p" data-note="" className={cn("max-w-prose gap-1 text-[0.8125rem] text-muted-foreground sm:gap-2 sm:text-sm lg:max-w-none", className)} icon={<CalendarClock className="size-3.5" strokeWidth={1.75} />}>
      {/* The server's clock paints first; once mounted, the key changes and React replaces the text with
          the browser's (hydration keeps server text, so an unchanged render would never correct it). */}
      <span key={next === null ? "server" : "client"} suppressHydrationWarning>
        {lastTrip(lastRun, roles)} {next ?? nextTrip()}
      </span>
    </IconText>
  );
}
