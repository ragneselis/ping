"use client";

import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ChipContent, chipClassName } from "@/components/category";
import { ChipScroller } from "@/components/chip-scroller";
import { categoryVars } from "@/lib/categories";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

const REMOTE_ITEMS = [
  { value: "any", label: "Any work setup" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];

/** Filters that live in the URL, so a filtered view can be shared. Changing one resets "load more". */
export function JobFilters({ categories, total }: { categories: { value: Category; label: string; count: number }[]; total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  // Latest query, so quick successive changes build on each other instead of on a stale URL.
  const query = useRef(params.toString());
  useEffect(() => {
    query.current = params.toString();
  }, [params]);

  const go = (qs: string) => {
    query.current = qs;
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(query.current);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    go(next.toString());
  };

  const category = params.get("category") ?? "";
  const remote = params.get("remote") ?? "any";
  const active = !!(category || params.get("estonia") || params.get("reach") || params.get("remote"));

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
      <div className="cut-corner flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border border-border bg-card px-3 py-1.5 [--cut-line:var(--border)]">
        {/* Labels are padded to a 44px hit area; tapping the text toggles the switch. */}
        <div className="flex items-center gap-2">
          <Switch id="estonia" checked={params.get("estonia") === "1"} onCheckedChange={(v) => set("estonia", v ? "1" : null)} />
          <Label htmlFor="estonia" className="min-h-11 pr-1">
            Open to Estonia
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="reach" checked={params.get("reach") === "1"} onCheckedChange={(v) => set("reach", v ? "1" : null)} />
          <Label htmlFor="reach" className="min-h-11 pr-1">
            Within reach
          </Label>
        </div>
        <Select items={REMOTE_ITEMS} value={remote} onValueChange={(v) => set("remote", v && v !== "any" ? String(v) : null)}>
          <SelectTrigger className="min-w-40" aria-label="Work setup">
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
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => go("")}>
            <X data-icon="inline-start" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}

function CategoryChip({ label, count, active, onClick, category }: { label: string; count: number; active: boolean; onClick: () => void; category?: Category }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} style={category ? categoryVars(category) : undefined} className={chipClassName(active, category)}>
      <ChipContent label={label} count={count} active={active} category={category} />
    </button>
  );
}
