import { CATEGORY_META, categoryVars } from "@/lib/categories";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

/*
 * Shared category styles. Every category colour on the site comes through here:
 * the element gets `--cat` and `--cat-text` from categoryVars() and these classes read them.
 * Colour is used only for the dot, the direction label on a job row, single-direction charts and the hiring chart.
 */
export const categoryClass = {
  /** Small dot in the category colour. */
  dot: "bg-(--cat)",
  /** Contrast-safe label text (AA on the surface). */
  text: "text-(--cat-text)",
} as const;

export function CategoryDot({ category, className }: { category: Category; className?: string }) {
  return <span aria-hidden style={categoryVars(category)} className={cn("inline-block size-2 shrink-0 rounded-full", categoryClass.dot, className)} />;
}

/** Dot plus the direction's short name in its text colour, as on a job row. */
export function CategoryLabel({ category, className }: { category: Category; className?: string }) {
  return (
    // On the text baseline beside other text (the baseline rule, globals.css); the dot centred on the capitals.
    <span style={categoryVars(category)} className={cn("inline-flex items-baseline gap-2 text-sm font-medium", categoryClass.text, className)}>
      <span aria-hidden className="cap-icon flex shrink-0 [--icon-size:8px]">
        <CategoryDot category={category} />
      </span>
      {CATEGORY_META[category].short}
    </span>
  );
}
