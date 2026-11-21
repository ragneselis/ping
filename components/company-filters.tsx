"use client";

import { X } from "lucide-react";
import { TabContent, tabClassName } from "@/components/filter-controls";
import { TabRow } from "@/components/tab-row";
import { Button } from "@/components/ui/button";
import { useQueryState } from "@/components/use-query-state";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Discover's filter: the Jobs direction tabs, for companies with open roles in a direction, and Reset.
 * It lives in the URL, so a filtered view can be shared. (Everything on Discover is in Estonia, so the
 * Open to Estonia filter does not apply.)
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
      {category && (
        <div className="flex">
          <Button variant="ghost" size="sm" className="min-h-11 sm:ml-auto sm:min-h-8" onClick={() => go("")}>
            <X data-icon="inline-start" />
            Reset
          </Button>
        </div>
      )}
    </div>
  );
}
