import { Sprout } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const EARLY_SIGNAL_LINE = "Few postings right now. Worth watching.";

/** Marks a direction with too few postings for charts to mean much. */
export function EarlySignalBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={cn("border-border font-mono text-foreground", className)}>
      <Sprout data-icon="inline-start" />
      Early signal
    </Badge>
  );
}

/** Skills or tools as a plain list with counts, used instead of charts for early-signal directions. */
export function CountList({ title, items, total, empty }: { title: string; items: { label: string; count: number }[]; total: number; empty: string }) {
  return (
    <div className="grid content-start gap-3">
      <h3 className="font-semibold">{title}</h3>
      {items.length ? (
        <ul className="grid gap-1.5">
          {items.map((i) => (
            <li key={i.label} className="flex items-baseline justify-between gap-4 border-b pb-1.5 text-sm last:border-0">
              <span>{i.label}</span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {i.count} of {total}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}
