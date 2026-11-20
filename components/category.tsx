
import { CATEGORY_META, categoryVars } from "@/lib/categories";
import { CATEGORIES, type Category } from "@/lib/types";
import { cn } from "@/lib/utils";

/*
 * Shared category styles. Every category colour on the site comes through here:
 * the element gets `--cat` from categoryVars() and these classes read it.
 */
export const categoryClass = {
  /** Primary tag: contrast-safe text (--cat-text) on a 15% tint of the vivid colour. */
  tag: "bg-(--cat)/15 text-(--cat-text)",
  /** Secondary tag: vivid outline, contrast-safe text, no background. */
  outline: "border border-(--cat) text-(--cat-text)",
  /** Small dot in the vivid colour. */
  dot: "bg-(--cat)",
  /** Selected filter chip: tinted like a primary tag, with a vivid border. */
  chipActive: "border-(--cat) bg-(--cat)/15 text-(--cat-text)",
} as const;

const TAG_BASE = "inline-flex h-5 w-fit shrink-0 items-center gap-1 rounded-sm px-2 font-mono text-xs font-medium whitespace-nowrap";

export function CategoryTag({ category, secondary = false, className }: { category: Category; secondary?: boolean; className?: string }) {
  return (
    <span
      style={categoryVars(category)}
      className={cn(TAG_BASE, secondary ? cn(categoryClass.outline, "px-1.5") : categoryClass.tag, className)}
    >
      {secondary && "+ "}
      {CATEGORY_META[category].short}
    </span>
  );
}

export function CategoryDot({ category, className }: { category: Category; className?: string }) {
  return <span aria-hidden style={categoryVars(category)} className={cn("inline-block size-2 shrink-0 rounded-full", categoryClass.dot, className)} />;
}

/**
 * Filter chip for a direction. Inactive chips show the category dot; an active chip takes the
 * category's tinted style. Without a category ("All directions") the active state is primary pink.
 */
export function chipClassName(active: boolean, category?: Category) {
  return cn(
    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
    active ? (category ? categoryClass.chipActive : "border-primary bg-primary text-primary-foreground") : "bg-card hover:border-foreground/30",
  );
}

export function ChipContent({ label, count, active, category }: { label: string; count?: number; active: boolean; category?: Category }) {
  return (
    <>
      {category && <CategoryDot category={category} />}
      {label}
      {count !== undefined && (
        <span className={cn("font-mono text-xs", active ? (category ? "text-(--cat-text)" : "text-primary-foreground/80") : "text-muted-foreground")}>{count}</span>
      )}
    </>
  );
}


/** One shared key for charts stacked by direction: dot plus short name, in the fixed category order. */
export function CategoryLegend({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground", className)} aria-label="Colour key for the charts">
      {CATEGORIES.map((c) => (
        <li key={c} className="flex items-center gap-1.5">
          <CategoryDot category={c} />
          {CATEGORY_META[c].short}
        </li>
      ))}
    </ul>
  );
}

/**
 * Toggle chip for non-category filters (e.g. level). 44px tall on phones, compact from sm up.
 * Tones when selected: "signal" = mint (within reach), "all" = pink (the "any" option), "plain" = inverted.
 */
export function toggleClassName(active: boolean, tone: "signal" | "all" | "plain" = "plain") {
  return cn(
    "flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:min-h-9",
    !active && "bg-card hover:border-foreground/30",
    active && tone === "signal" && "border-accent bg-accent text-accent-foreground",
    active && tone === "all" && "border-primary bg-primary text-primary-foreground",
    active && tone === "plain" && "border-foreground bg-foreground text-background",
  );
}
