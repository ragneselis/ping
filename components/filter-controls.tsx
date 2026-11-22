import { useId, type ComponentProps, type ReactNode } from "react";
import { CategoryDot } from "@/components/category";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { IconText } from "@/components/icon-text";

/*
 * Ping's filter controls: text tabs for directions and square segmented controls for everything else.
 * No pills. Hairlines and type carry the state; colour appears only as a direction's dot.
 */

/** A text tab inside TabRow (components/tab-row.tsx). 44px tall, matching the row's repeating hairline. The active tab gets the strong rule. */
export function tabClassName(active: boolean) {
  return cn(
    "relative flex h-11 snap-start items-center gap-2 border-b text-sm whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:after:absolute focus-visible:after:inset-x-0 focus-visible:after:inset-y-2 focus-visible:after:ring-2 focus-visible:after:ring-ring",
    active ? "border-brand-lg font-medium text-foreground" : "border-transparent text-muted-foreground hover:border-hairline-strong hover:text-foreground",
  );
}

/**
 * A tab's dot, label and count. The tab box centres this row in its 44px; inside it the label and the
 * smaller mono count share one text baseline (`baseline-row`) and the dot is centred on the capitals
 * by IconText (the icon rule), like every other icon or dot next to text.
 */
export function TabContent({ label, count, category }: { label: string; count?: number; category?: Category }) {
  return (
    <IconText icon={category && <CategoryDot category={category} />}>
      <span className="baseline-row gap-2">
        {label}
        {count !== undefined && <span className="font-mono text-xs text-muted-foreground tabular-nums">{count.toLocaleString("en-GB")}</span>}
      </span>
    </IconText>
  );
}

/** Small mono label for a filter group or a table column. Beside other text, in a `baseline-row` (globals.css). */
export function DataLabel({ children, className, ...rest }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <span className={cn("label-mono text-muted-foreground", className)} {...rest}>
      {children}
    </span>
  );
}

/**
 * A row of filter controls (Segmented, a count, a button). The one breakpoint rule for them: on phones
 * a full-width column, each control on its own line with its label above it; from sm one baseline row
 * that wraps. Callers set only the sm gap between controls.
 */
export function FilterRow({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("grid w-full gap-4 sm:baseline-row sm:w-auto sm:flex-wrap", className)} {...props} />;
}

export interface SegmentItem {
  value: string;
  label: string;
}

/**
 * Segmented control: square, hairline borders, the selected segment in solid foreground.
 * `isActive` decides selection, so the same control serves single and multiple choice.
 * From sm the label sits beside the control on its text baseline (`baseline-row`), so LEVEL reads on
 * the same line as the segment words. Fills the width on phones (44px tall), compact from sm up. `stacked` keeps the label above the
 * control at every width (forms, where labels of different lengths would otherwise stagger).
 */
export function Segmented({
  label,
  items,
  isActive,
  onSelect,
  className,
  stacked = false,
}: {
  label: string;
  items: SegmentItem[];
  isActive: (value: string) => boolean;
  onSelect: (value: string) => void;
  className?: string;
  stacked?: boolean;
}) {
  // Unique per instance: the Jobs filters and the subscription modal can both show a "Level" control.
  const id = `seg-${useId()}`;
  return (
    <div className={cn("grid gap-1.5", !stacked && "sm:baseline-row sm:gap-3", className)}>
      <DataLabel id={id}>{label}</DataLabel>
      <div role="group" aria-labelledby={id} className={cn("flex w-full border border-hairline-strong bg-card", stacked ? "sm:w-fit" : "sm:w-auto")}>
        {items.map((it) => {
          const active = isActive(it.value);
          return (
            <button
              key={it.value}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(it.value)}
              className={cn(
                "min-h-11 flex-1 border-l border-hairline-strong px-3 text-sm whitespace-nowrap transition-colors first:border-l-0 focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:min-h-8 sm:flex-none",
                active ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground hover:bg-brand-tint hover:text-foreground",
              )}
            >
              {it.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
