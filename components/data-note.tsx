import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { freshness } from "@/lib/format";

/**
 * The hero's data note, the same sentence on every page: how many postings the numbers come
 * from, when the daily refresh last ran and when the next one is due, in Tallinn time, e.g.
 * "Based on 1,271 current postings. Updated today at 06:00, next update tomorrow at 06:00."
 * Everything comes from the dataset (data/run.json); pages render per request, so "today" is real.
 */
export function DataNote({ postings, lastRun, nextRun, className }: { postings: number; lastRun: string | null; nextRun: string | null; className?: string }) {
  return (
    <p className={cn("flex max-w-prose items-start gap-2 text-sm text-pretty text-muted-foreground", className)}>
      <CalendarClock aria-hidden className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.75} />
      <span>
        Based on {postings.toLocaleString("en-GB")} current postings. {freshness(lastRun, nextRun)}
      </span>
    </p>
  );
}
