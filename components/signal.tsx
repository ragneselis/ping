import { GraduationCap, Globe2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * Signals: the facts a graduate decides on (open to Estonia, within reach, level).
 * They use --accent (mint), the "good news" colour, so they never compete with
 * category colours or with pink, which stays for the brand and actions.
 */
/** Solid mint at full strength with navy text: a shape no category tag uses (those are tints or outlines). */
const SIGNAL = "inline-flex h-5 w-fit shrink-0 items-center gap-1 rounded-sm bg-accent px-1.5 font-mono text-xs font-semibold whitespace-nowrap text-accent-foreground [&>svg]:size-3";

export function SignalTag({ kind, className }: { kind: "estonia" | "reach"; className?: string }) {
  return (
    <span className={cn(SIGNAL, className)}>
      {kind === "estonia" ? <Globe2 aria-hidden /> : <GraduationCap aria-hidden />}
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
