"use client";

import { ArrowDown, X } from "lucide-react";
import {
  DataLabel,
  Segmented,
  TabContent,
  tabClassName,
} from "@/components/filter-controls";
import { TabRow } from "@/components/tab-row";
import { JOB_GRID, ROW_BLEED } from "@/components/job-row";
import { useQueryState } from "@/components/use-query-state";
import { Button } from "@/components/ui/button";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Level options, in order. Several can be selected; none selected means all levels. */
const LEVEL_ITEMS = [
  { value: "reach", label: "Within reach" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "any", label: "Any" },
];
const ESTONIA_ITEMS = [
  { value: "any", label: "Anywhere" },
  { value: "1", label: "Open to Estonia" },
];
const REMOTE_ITEMS = [
  { value: "any", label: "Any" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];

const readLevels = (params: URLSearchParams) => {
  const set = new Set((params.get("level") ?? "").split(",").filter(Boolean));
  if (params.get("reach") === "1") set.add("reach");
  return set;
};

/** Filters that live in the URL, so a filtered view can be shared. Changing one resets "load more". */
export function JobFilters({
  categories,
  total,
}: {
  categories: { value: Category; label: string; count: number }[];
  total: number;
}) {
  const { params, pending, go, set, update } = useQueryState();

  const category = params.get("category") ?? "";
  const remote = params.get("remote") ?? "any";
  const estonia = params.get("estonia") === "1" ? "1" : "any";
  const levels = readLevels(params);
  const active = !!(
    category ||
    params.get("estonia") ||
    levels.size ||
    params.get("remote") ||
    params.get("sort")
  );

  const selectLevel = (value: string) => {
    if (value === "any")
      return update({ level: null, reach: null, sort: null });
    const next = new Set(levels);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    const list = LEVEL_ITEMS.map((l) => l.value).filter((v) => next.has(v));
    // A sort chosen for the previous selection may no longer fit; let the default follow the levels.
    update({
      level: list.length ? list.join(",") : null,
      reach: null,
      sort: null,
    });
  };

  return (
    <div
      className={cn("grid gap-5 transition-opacity", pending && "opacity-60")}
      aria-busy={pending}
    >
      <TabRow label="Direction" activeKey={category}>
        <button
          type="button"
          aria-pressed={!category}
          className={tabClassName(!category)}
          onClick={() => set("category", null)}
        >
          <TabContent label="All directions" count={total} />
        </button>
        {categories.map((c) => (
          <button
            key={c.value}
            type="button"
            aria-pressed={category === c.value}
            className={tabClassName(category === c.value)}
            onClick={() => set("category", c.value)}
          >
            <TabContent label={c.label} count={c.count} category={c.value} />
          </button>
        ))}
      </TabRow>
      <div className="grid gap-4 sm:flex sm:flex-wrap sm:items-end sm:gap-x-8">
        <Segmented
          label="Level"
          items={LEVEL_ITEMS}
          isActive={(v) => (v === "any" ? levels.size === 0 : levels.has(v))}
          onSelect={selectLevel}
        />
        <Segmented
          label="Location"
          items={ESTONIA_ITEMS}
          isActive={(v) => v === estonia}
          onSelect={(v) => set("estonia", v === "1" ? "1" : null)}
        />
        <Segmented
          label="Work setup"
          items={REMOTE_ITEMS}
          isActive={(v) => v === remote}
          onSelect={(v) => set("remote", v === "any" ? null : v)}
        />
        {active && (
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11 sm:ml-auto sm:min-h-8"
            onClick={() => go("")}
          >
            <X data-icon="inline-start" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * The list's header row: small mono column labels. Level and Posted are the sort controls,
 * as in a table: sorting by level puts roles within reach first, sorting by posted puts the newest first.
 * On phones the columns collapse, so only the two sort controls remain.
 */
export function JobListHeader({ sort }: { sort: "reach" | "newest" }) {
  const { set, pending } = useQueryState();
  const sortButton = (
    value: "reach" | "newest",
    label: string,
    hint: string,
    className?: string,
  ) => (
    <button
      type="button"
      aria-pressed={sort === value}
      aria-label={`Sort by ${hint}`}
      onClick={() => set("sort", value)}
      className={cn(
        "-mx-1 flex min-h-11 items-center gap-1 px-1 font-mono text-[0.7rem] tracking-wider uppercase transition-colors focus-visible:outline-2 focus-visible:outline-ring lg:min-h-0",
        sort === value
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {label}
      <ArrowDown
        aria-hidden
        className={cn("size-3", sort !== value && "opacity-0")}
      />
    </button>
  );
  return (
    <div
      className={cn(
        "border-b border-border-strong transition-opacity",
        ROW_BLEED,
        pending && "opacity-60",
      )}
    >
      <div className="flex items-center gap-4 lg:hidden">
        <DataLabel>Sort</DataLabel>
        {sortButton("reach", "Within reach first", "level, within reach first")}
        {sortButton("newest", "Newest", "date posted, newest first")}
      </div>
      <div className={cn(JOB_GRID, "hidden py-2.5 lg:grid")}>
        <DataLabel>Direction</DataLabel>
        <DataLabel>Role</DataLabel>
        <DataLabel>Location</DataLabel>
        {sortButton("reach", "Level", "level, within reach first")}
        <DataLabel>Signals</DataLabel>
        {sortButton("newest", "Posted", "date posted, newest first")}
        <span />
      </div>
    </div>
  );
}
