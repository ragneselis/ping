"use client";

import { ArrowDown, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
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
  { value: "any", label: "Any" },
  { value: "reach", label: "Within reach" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
];
const ESTONIA_ITEMS = [
  { value: "any", label: "Any" },
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
  // Several directions can arrive from an email link (?category=product,game); a tab click picks one.
  const selected = new Set(category.split(",").filter(Boolean));
  const remote = params.get("remote") ?? "any";
  const estonia = params.get("estonia") === "1" ? "1" : "any";
  const levels = readLevels(params);
  const active = !!(
    params.get("q") ||
    category ||
    params.get("estonia") ||
    levels.size ||
    params.get("remote")
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
      <SearchField
        value={params.get("q") ?? ""}
        onChange={(v) => set("q", v || null)}
      />
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
          // Empty directions stay in place, dimmed with 0; the selected one stays usable.
          <button
            key={c.value}
            type="button"
            aria-pressed={selected.has(c.value)}
            disabled={c.count === 0 && !selected.has(c.value)}
            className={cn(
              tabClassName(selected.has(c.value)),
              "disabled:opacity-40 disabled:hover:border-transparent disabled:hover:text-muted-foreground",
            )}
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
            // Clearing keeps the chosen sort.
            onClick={() =>
              go(params.get("sort") ? `sort=${params.get("sort")}` : "")
            }
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
 * The list's header row (from lg): small mono column labels. Level and Posted also sort, as in
 * a table: by level puts roles within reach first, by posted puts the newest first. The explicit
 * Sort control next to the job count does the same on every screen size.
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
      {/* A faint arrow at rest marks the column as sortable; it darkens when active. */}
      <ArrowDown
        aria-hidden
        className={cn("size-3", sort !== value && "opacity-35")}
      />
    </button>
  );
  return (
    <div
      className={cn(
        "hidden border-b border-border-strong transition-opacity lg:block",
        ROW_BLEED,
        pending && "opacity-60",
      )}
    >
      <div className={cn(JOB_GRID, "grid py-2.5")}>
        <DataLabel>Direction</DataLabel>
        <DataLabel>Role</DataLabel>
        <DataLabel>Location</DataLabel>
        {sortButton("reach", "Level", "level, within reach first")}
        <DataLabel>For you</DataLabel>
        {sortButton("newest", "Posted", "date posted, newest first")}
        <span />
      </div>
    </div>
  );
}

const SORT_ITEMS = [
  { value: "reach", label: "Within reach first" },
  { value: "newest", label: "Newest" },
];

/** The sort control before the URL is readable (Suspense fallback): identical, so nothing shifts. */
export function SortControlFallback({ sort }: { sort: "reach" | "newest" }) {
  return <Segmented label="Sort" items={SORT_ITEMS} isActive={(v) => v === sort} onSelect={() => {}} />;
}

/** The explicit sort control, next to "N jobs match" on every screen size. */
export function SortControl({ sort }: { sort: "reach" | "newest" }) {
  const { set, pending } = useQueryState();
  return (
    <Segmented
      label="Sort"
      items={SORT_ITEMS}
      isActive={(v) => v === sort}
      onSelect={(v) => set("sort", v)}
      className={cn("transition-opacity", pending && "opacity-60")}
    />
  );
}

/**
 * Free-text search over title, company, place, top requirements and direction. Square, hairline,
 * 44px tall; it writes to the URL (`q`) a moment after typing stops, and follows the URL when
 * filters are cleared elsewhere.
 */
function SearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  useEffect(() => {
    if (text.trim() === value) return;
    const t = setTimeout(() => onChange(text.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return (
    <div className="relative max-w-xl">
      <label htmlFor="job-search" className="sr-only">
        Search jobs
      </label>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
        strokeWidth={1.75}
      />
      <input
        id="job-search"
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onChange(text.trim());
        }}
        placeholder="Search roles, companies, skills"
        autoComplete="off"
        className="h-11 w-full rounded-sm border border-hairline-strong bg-card pr-11 pl-10 text-base text-foreground transition-colors outline-none placeholder:text-muted-foreground hover:border-foreground/40 focus-visible:border-brand-lg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setText("");
            onChange("");
          }}
          className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
