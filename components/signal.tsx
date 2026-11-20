import { GraduationCap, Globe2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * Signals: the facts a graduate decides on (open to Estonia, within reach).
 * Quiet by design: a small mint icon followed by plain text, so a card has one loud thing
 * (its category tag) and the signal still reads at a glance. Both signals share this one style;
 * the icon uses --signal (mint in dark, a deeper green in light), the label stays --foreground.
 */
export function SignalTag({ kind, className }: { kind: "estonia" | "reach"; className?: string }) {
  const Icon = kind === "estonia" ? Globe2 : GraduationCap;
  return (
    <span className={cn("flex items-center gap-1.5 font-normal text-foreground", className)}>
      <Icon aria-hidden className="size-3.5 shrink-0 text-signal" />
      {kind === "estonia" ? "Open to Estonia" : "Within reach"}
    </span>
  );
}

/** Seniority as a quiet mono readout, e.g. "JUNIOR" or "LEVEL NOT STATED". */
export function LevelTag({ level, className }: { level: string; className?: string }) {
  return <span className={cn("font-mono text-xs tracking-wide text-muted-foreground uppercase", className)}>{level}</span>;
}

/** One extracted requirement (skill or tool). */
export function RequirementChip({ children }: { children: ReactNode }) {
  return <li className="rounded-sm bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">{children}</li>;
}
