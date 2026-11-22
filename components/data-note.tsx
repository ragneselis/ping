"use client";

import { CalendarClock } from "lucide-react";
import { IconText } from "@/components/icon-text";
import { tripNote } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The hero's data note, the same fixed sentence on Jobs, Discover and Market insights, in Ping's voice:
 * "Ping's last trip: 22 Nov at 05:52. Next one every day at 05:47." No relative words ("this morning",
 * "yesterday"), so it is never wrong however late a run is or how long a page stays open. The date comes
 * from the last successful run (data/run.json), formatted here on the client, always in Europe/Tallinn;
 * the next time is the schedule (lib/schedule.ts) in Tallinn on today's date, so summer time is right.
 */
export function DataNote({ lastRun, className }: { lastRun: string | null; className?: string }) {
  return (
    // The icon sits on the first line's capitals even when the sentence wraps (IconText).
    <IconText as="p" data-note="" className={cn("max-w-prose gap-2 text-sm text-pretty text-muted-foreground", className)} icon={<CalendarClock className="size-3.5" strokeWidth={1.75} />}>
      {/* Server and client format the same stored moment in the same time zone; only a page rendered
          across a summer-time switch could differ, so the client's text wins without a warning. */}
      <span suppressHydrationWarning>{tripNote(lastRun)}</span>
    </IconText>
  );
}
