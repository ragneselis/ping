"use client";

import { X } from "lucide-react";
import { Segmented, TabContent, tabClassName } from "@/components/filter-controls";
import { TabRow } from "@/components/tab-row";
import { Button } from "@/components/ui/button";
import { useQueryState } from "@/components/use-query-state";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

const ESTONIA_ITEMS = [
  { value: "any", label: "Any" },
  { value: "1", label: "Open to Estonia" },
];
const SORT_ITEMS = [
  { value: "roles", label: "Most roles" },
  { value: "newest", label: "Newest" },
];

/**
 * Discover's filters: the Jobs filters that apply to companies (direction, Open to Estonia), with the
 * same tabs, segmented controls and Reset. They live in the URL, so a filtered view can be shared.
 */
export function CompanyFilters({
  directions,
  total,
}: {
  directions: { value: Category; label: string; count: number }[];
  total: number;
}) {
  const { params, go, set } = useQueryState();
  const category = params.get("category") ?? "";
  const estonia = params.get("estonia") === "1" ? "1" : "any";
  const active = !!(category || params.get("estonia") || params.get("sort") === "newest");
  return (
    <div className="grid gap-5">
      <TabRow label="Direction" activeKey={category}>
        <button type="button" aria-pressed={!category} className={tabClassName(!category)} onClick={() => set("category", null)}>
          <TabContent label="All directions" count={total} />
        </button>
        {directions.map((d) => (
          <button
            key={d.value}
            type="button"
            aria-pressed={category === d.value}
            disabled={d.count === 0 && category !== d.value}
            className={cn(tabClassName(category === d.value), "disabled:opacity-40 disabled:hover:border-transparent disabled:hover:text-muted-foreground")}
            onClick={() => set("category", d.value)}
          >
            <TabContent label={d.label} count={d.count} category={d.value} />
          </button>
        ))}
      </TabRow>
      <div className="grid gap-4 sm:baseline-row sm:flex-wrap sm:gap-x-8">
        <Segmented label="Location" items={ESTONIA_ITEMS} isActive={(v) => v === estonia} onSelect={(v) => set("estonia", v === "1" ? "1" : null)} />
        {active && (
          <Button variant="ghost" size="sm" className="min-h-11 sm:ml-auto sm:min-h-8" onClick={() => go("")}>
            <X data-icon="inline-start" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}

/** The sort control next to the company count: most roles first, or the newest role first. */
export function CompanySortControl({ sort }: { sort: "roles" | "newest" }) {
  const { set, pending } = useQueryState();
  return (
    <Segmented
      label="Sort"
      items={SORT_ITEMS}
      isActive={(v) => v === sort}
      onSelect={(v) => set("sort", v === "roles" ? null : v)}
      className={cn("transition-opacity", pending && "opacity-60")}
    />
  );
}

export function CompanySortFallback({ sort }: { sort: "roles" | "newest" }) {
  return <Segmented label="Sort" items={SORT_ITEMS} isActive={(v) => v === sort} onSelect={() => {}} />;
}
