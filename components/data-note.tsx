import { CalendarClock } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The hero's data note: where the numbers come from and when they were last refreshed.
 * Small muted text with the calendar icon, directly under the intro line on both pages.
 */
export function DataNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("flex max-w-prose items-start gap-2 text-sm text-pretty text-muted-foreground", className)}>
      <CalendarClock aria-hidden className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.75} />
      <span>{children}</span>
    </p>
  );
}
