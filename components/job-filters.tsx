"use client";

import { X } from "lucide-react";
import { ChipContent, chipClassName, toggleClassName } from "@/components/category";
import { ChipScroller } from "@/components/chip-scroller";
import { useQueryState } from "@/components/use-query-state";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { categoryVars } from "@/lib/categories";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

const REMOTE_ITEMS = [
  { value: "any", label: "Any work setup" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];

/** Level options, in order. Several can be selected; none selected means all levels. */
const LEVEL_ITEMS = [
  { value: "reach", label: "Within reach (0 to 2 yrs)", tone: "signal" as const },
  { value: "mid", label: "Mid-level", tone: "plain" as const },
  { value: "senior", label: "Senior and above", tone: "plain" as const },
];

const readLevels = (params: URLSearchParams) => {
  const set = new Set((params.get("level") ?? "").split(",").filter(Boolean));
  if (params.get("reach") === "1") set.add("reach");
  return set;
};

/** Filters that live in the URL, so a filtered view can be shared. Changing one resets "load more". */
export function JobFilters({ categories, total }: { categories: { value: Category; label: string; count: number }[]; total: number }) {
  const { params, pending, go, set, update } = useQueryState();

  const category = params.get("category") ?? "";
  const remote = params.get("remote") ?? "any";
  const levels = readLevels(params);
  const active = !!(category || params.get("estonia") || levels.size || params.get("remote") || params.get("sort"));

  const toggleLevel = (value: string) => {
    const next = new Set(levels);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    const list = LEVEL_ITEMS.map((l) => l.value).filter((v) => next.has(v));
    // A sort chosen for the previous selection may no longer fit; let the default follow the levels.
    update({ level: list.length ? list.join(",") : null, reach: null, sort: null });
  };

  return (
    <div className={cn("grid gap-4 transition-opacity", pending && "opacity-60")} aria-busy={pending}>
      <ChipScroller activeKey={category}>
        <div className="flex w-max gap-2 md:w-auto md:flex-wrap" role="group" aria-label="Category">
          <CategoryChip label="All directions" count={total} active={!category} onClick={() => set("category", null)} />
          {categories.map((c) => (
            <CategoryChip
              key={c.value}
              category={c.value}
              label={c.label}
              count={c.count}
              active={category === c.value}
              onClick={() => set("category", c.value)}
            />
          ))}
        </div>
      </ChipScroller>
      <div className="cut-corner grid gap-3 rounded-lg border border-border bg-card px-3 py-3 [--cut-line:var(--border)]">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Level">
          <span className="mr-1 text-sm font-medium text-muted-foreground">Level</span>
          {LEVEL_ITEMS.map((l) => (
            <button
              key={l.value}
              type="button"
              aria-pressed={levels.has(l.value)}
              className={toggleClassName(levels.has(l.value), l.tone)}
              onClick={() => toggleLevel(l.value)}
            >
              {l.label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={levels.size === 0}
            className={toggleClassName(levels.size === 0, "all")}
            onClick={() => update({ level: null, reach: null, sort: null })}
          >
            Any level
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          {/* The label is padded to a 44px hit area; tapping the text toggles the switch. */}
          <div className="flex items-center gap-2">
            <Switch id="estonia" checked={params.get("estonia") === "1"} onCheckedChange={(v) => set("estonia", v ? "1" : null)} />
            <Label htmlFor="estonia" className="min-h-11 pr-1">
              Open to Estonia
            </Label>
          </div>
          <Select items={REMOTE_ITEMS} value={remote} onValueChange={(v) => set("remote", v && v !== "any" ? String(v) : null)}>
            <SelectTrigger className="min-h-11 min-w-40 sm:min-h-8" aria-label="Work setup">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REMOTE_ITEMS.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {active && (
            <Button variant="ghost" size="sm" className="ml-auto min-h-11 sm:min-h-7" onClick={() => go("")}>
              <X data-icon="inline-start" />
              Clear filters
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

const SORT_ITEMS = [
  { value: "reach", label: "Within reach first" },
  { value: "newest", label: "Newest first" },
];

/** Sort order, next to the result count. `value` is the effective sort (from the URL, or the default for the levels). */
export function SortSelect({ value }: { value: "reach" | "newest" }) {
  const { set, pending } = useQueryState();
  return (
    <Select items={SORT_ITEMS} value={value} onValueChange={(v) => set("sort", v ? String(v) : null)}>
      <SelectTrigger className={cn("min-h-11 min-w-44 sm:min-h-8", pending && "opacity-60")} aria-label="Sort jobs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SORT_ITEMS.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CategoryChip({
  label,
  count,
  active,
  onClick,
  category,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  category?: Category;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} style={category ? categoryVars(category) : undefined} className={chipClassName(active, category)}>
      <ChipContent label={label} count={count} active={active} category={category} />
    </button>
  );
}
