import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A label with a small leading icon (or the fresh tile), the icon centred on the text's capital letters.
 *
 * Why not items-center: that centres the icon on the line box, but Ping's labels are mostly uppercase
 * (11px Geist Mono, no descenders), so the letters sit in the upper part of the line box and the icon
 * looks low. Instead the row aligns on the text baseline (the icon's bottom edge on the baseline), then
 * the `cap-icon` utility moves the icon down by half its size less half the cap height (Geist and Geist
 * Mono both: 0.71em), so its centre lands halfway up the capitals. Works at any font size, on wrapped
 * labels (first line), and in every browser. Used by the readouts and the job-list signals.
 */
export function IconLabel({
  icon,
  iconSize,
  children,
  className,
}: {
  icon: ReactNode;
  /** The icon's rendered size in px (size-3.5 = 14, the fresh tile = 8). */
  iconSize: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("flex items-baseline gap-2", className)}>
      <span aria-hidden className="cap-icon flex shrink-0" style={{ "--icon-size": `${iconSize}px` } as CSSProperties}>
        {icon}
      </span>
      <span className="min-w-0">{children}</span>
    </span>
  );
}
