import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUpdated } from "@/lib/format";

/**
 * The hero's data note, the same sentence on every page: how many postings the numbers come
 * from and when they were last refreshed. Small muted text with the calendar icon, directly
 * under the intro line. Both values come from the dataset.
 */
export function DataNote({ postings, updatedAt, className }: { postings: number; updatedAt: string | null; className?: string }) {
  return (
    <p className={cn("flex max-w-prose items-start gap-2 text-sm text-pretty text-muted-foreground", className)}>
      <CalendarClock aria-hidden className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.75} />
      <span>
        Based on {postings.toLocaleString("en-GB")} current postings. Last updated {formatUpdated(updatedAt)}.
      </span>
    </p>
  );
}
