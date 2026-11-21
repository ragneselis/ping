import { GraduationCap, Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Signals: the facts a graduate decides on (open to Estonia, within reach).
 * Quiet by design: a small Lucide icon and plain text, both in the foreground colour. No fill, no colour.
 */
export const SIGNAL_ICON = { estonia: Globe2, reach: GraduationCap } as const;
export const SIGNAL_LABEL = { estonia: "Open to Estonia", reach: "Within reach" } as const;

export function SignalTag({ kind, className }: { kind: "estonia" | "reach"; className?: string }) {
  const Icon = SIGNAL_ICON[kind];
  return (
    <span className={cn("flex items-center gap-1.5 whitespace-nowrap text-foreground", className)}>
      <Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} />
      {SIGNAL_LABEL[kind]}
    </span>
  );
}

/** Ping's signature: a pink dot. Pulses softly unless the reader prefers reduced motion. */
export function PulseDot({ once = false, className }: { once?: boolean; className?: string }) {
  return <span aria-hidden className={cn("pulse-dot", once ? "pulse-once" : "pulse-soft", className)} />;
}

/** Seniority as a quiet mono readout, e.g. "JUNIOR" or "NOT STATED". */
export function LevelTag({ level, className }: { level: string; className?: string }) {
  return <span className={cn("font-mono text-xs tracking-wide text-muted-foreground uppercase", className)}>{level}</span>;
}

/** Requirements as plain muted text separated by commas. */
export function RequirementList({ items, className }: { items: string[]; className?: string }) {
  if (!items.length) return null;
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      <span className="sr-only">Asks for: </span>
      {items.join(", ")}
    </p>
  );
}
