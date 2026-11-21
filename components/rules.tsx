import type React from "react";
import { cn } from "@/lib/utils";

/*
 * GrönLoop's rule vocabulary, ported from ~/Documents/gronloop (src/components/quote.tsx).
 * The dispersing stack: eight 1px solid hairlines whose gaps widen downward, like a signal
 * spreading out. The numbers are heights, so the lines land at 0, 3, 7, 13, 23, 37, 55 and 75px.
 */
const DISPERSING_RULES = [3, 4, 6, 10, 14, 18, 20, 32];

/** Bleeds out to the frame lines (the column's own padding), so the lines run frame to frame. */
export function DispersingRules({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("-mx-4 md:-mx-6 lg:-mx-8", className)}>
      {/* Each line draws in from the left once on load, a few ms after the one above (globals.css). */}
      {DISPERSING_RULES.map((gap, i) => (
        <div key={`${gap}-${i}`} data-rule-draw="" style={{ height: gap, "--i": i } as React.CSSProperties} className="border-t border-hairline" />
      ))}
    </div>
  );
}
