import { CATEGORY_META, categoryVars } from "@/lib/categories";
import { CATEGORIES, type Category } from "@/lib/types";
import { cn } from "@/lib/utils";

/*
 * Shared category styles. Every category colour on the site comes through here:
 * the element gets `--cat`, `--cat-strong` and `--cat-text` from categoryVars() and these classes read them.
 * Colour is used only for the dot, the label on a job row, row highlights, chart fills and per-direction blocks.
 */
export const categoryClass = {
  /** Small dot in the strong tone (thin marks need 3:1 on white). */
  dot: "bg-(--cat-strong)",
  /** Contrast-safe label text (AA on the surface). */
  text: "text-(--cat-text)",
} as const;

export function CategoryDot({ category, className }: { category: Category; className?: string }) {
  return <span aria-hidden style={categoryVars(category)} className={cn("inline-block size-2 shrink-0 rounded-full", categoryClass.dot, className)} />;
}

/** Dot plus the direction's short name in its text colour, as on a job row. */
export function CategoryLabel({ category, className }: { category: Category; className?: string }) {
  return (
    <span style={categoryVars(category)} className={cn("inline-flex items-center gap-2 text-sm font-medium", categoryClass.text, className)}>
      <CategoryDot category={category} />
      {CATEGORY_META[category].short}
    </span>
  );
}

/** One shared key for charts stacked by direction: dot plus short name, in the fixed category order. */
export function CategoryLegend({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground", className)} aria-label="Colour key for the charts">
      {CATEGORIES.map((c) => (
        <li key={c} className="flex items-center gap-1.5">
          <CategoryDot category={c} />
          {CATEGORY_META[c].short}
        </li>
      ))}
    </ul>
  );
}
