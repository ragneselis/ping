"use client";

import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const REMOTE_ITEMS = [
  { value: "any", label: "Any work setup" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];

/** Filters that live in the URL, so a filtered view can be shared. Changing one resets "load more". */
export function JobFilters({ categories, total }: { categories: { value: string; label: string; count: number }[]; total: number }) {
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
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:overflow-visible md:px-0">
        <div className="flex w-max gap-2 md:w-auto md:flex-wrap" role="group" aria-label="Category">
          <CategoryChip label="All directions" count={total} active={!category} onClick={() => set("category", null)} />
          {categories.map((c) => (
            <CategoryChip key={c.value} label={c.label} count={c.count} active={category === c.value} onClick={() => set("category", c.value)} />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border bg-card p-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Switch id="estonia" checked={params.get("estonia") === "1"} onCheckedChange={(v) => set("estonia", v ? "1" : null)} />
          <Label htmlFor="estonia">Open to Estonia</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="reach" checked={params.get("reach") === "1"} onCheckedChange={(v) => set("reach", v ? "1" : null)} />
          <Label htmlFor="reach">Within reach</Label>
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

function CategoryChip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/60",
      )}
    >
      {label}
      <span className={cn("font-mono text-xs", active ? "text-primary-foreground/80" : "text-muted-foreground")}>{count}</span>
    </button>
  );
}
