"use client";

import { CalendarClock } from "lucide-react";
import { IconText } from "@/components/icon-text";
import { tripNote } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The hero's data note, the same fixed sentence on Jobs, Discover and Market insights, in Ping's voice:
 * "Ping last went out on 22 November at 08:36 and found 1,281 roles. Next trip every morning at 06:00."
 * No relative words ("this morning", "yesterday"), so it is never wrong however late a run is or how
 * long a page stays open. The date comes from the last successful run (data/run.json), formatted here on
 * the client, always in Europe/Tallinn; the second sentence is fixed.
 */
export function DataNote({ lastRun, roles, className }: { lastRun: string | null; roles: number; className?: string }) {
  return (
    // The icon sits on the first line's capitals even when the sentence wraps (IconText).
    <IconText as="p" data-note="" className={cn("max-w-prose gap-2 text-sm text-muted-foreground", className)} icon={<CalendarClock className="size-3.5" strokeWidth={1.75} />}>
      {/* Server and client format the same stored moment in the same time zone; only a page rendered
          across a summer-time switch could differ, so the client's text wins without a warning. */}
      <span suppressHydrationWarning>{tripNote(lastRun, roles)}</span>
    </IconText>
  );
}
