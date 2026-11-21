import { GraduationCap, Globe2 } from "lucide-react";
import { IconText } from "@/components/icon-text";
import { cn } from "@/lib/utils";

/*
 * Signals: the facts a graduate decides on (open to Estonia, within reach).
 * In Ping's emerald accent: a small Lucide icon and the label in --brand-sm (5.48:1 on white).
 */
export const SIGNAL_ICON = { estonia: Globe2, reach: GraduationCap } as const;
export const SIGNAL_LABEL = { estonia: "Open to Estonia", reach: "Within reach" } as const;

/** `label` replaces the standard wording where a page needs another fact with the same meaning ("Based in Estonia"). */
export function SignalTag({ kind, label, className }: { kind: "estonia" | "reach"; label?: string; className?: string }) {
  const Icon = SIGNAL_ICON[kind];
  return (
    <IconText
      icon={<Icon className="size-3.5" strokeWidth={1.75} />}
      className={cn("gap-1.5 font-medium whitespace-nowrap text-brand-sm", className)}
    >
      {label ?? SIGNAL_LABEL[kind]}
    </IconText>
  );
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
