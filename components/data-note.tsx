import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { scoutNote } from "@/lib/format";
import { IconText } from "@/components/icon-text";

/**
 * The hero's data note, the same sentence on every page, in Ping's voice: when the daily refresh last
 * ran, how many roles the numbers come from and when the next one is due, in Tallinn time, e.g.
 * "Ping went out at 06:00 this morning and found 1,278 roles. Back tomorrow at 06:00."
 * Everything comes from the dataset (data/run.json); pages render per request, so "today" is real.
 */
export function DataNote({ postings, lastRun, nextRun, className }: { postings: number; lastRun: string | null; nextRun: string | null; className?: string }) {
  return (
    // The icon sits on the first line's capitals even when the sentence wraps (IconText).
    <IconText as="p" data-note="" className={cn("max-w-prose gap-2 text-sm text-pretty text-muted-foreground", className)} icon={<CalendarClock className="size-3.5" strokeWidth={1.75} />}>
      {scoutNote(postings, lastRun, nextRun)}
    </IconText>
  );
}
