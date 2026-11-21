import { ArrowDown } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Band } from "@/components/blueprint";
import { CompanyFilters, CompanySortControl, CompanySortFallback } from "@/components/company-filters";
import { COMPANY_GRID, CompanyRow } from "@/components/company-row";
import { DataLabel } from "@/components/filter-controls";
import { FilterLink, RESULTS_ID, ResultsTarget } from "@/components/filter-link";
import { ROW_BLEED } from "@/components/job-row";
import { Panel } from "@/components/panel";
import { ResultsFade } from "@/components/results-fade";
import { HeroTiles } from "@/components/tiles";
import { Button } from "@/components/ui/button";
import { CATEGORY_META } from "@/lib/categories";
import { shareMetadata } from "@/lib/share";
import { cn } from "@/lib/utils";
import { companyDirectory, directionOrder, getDataset, parseFilters, resolveCompanySort } from "@/lib/view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "Discover | Ping" },
  ...shareMetadata("Discover | Ping"),
};

type Search = Record<string, string | string[] | undefined>;

const PAGE_SIZE = 50;

/**
 * Discover: every company Ping tracks or has seen hiring designers (lib/view.ts, companyDirectory),
 * most current design roles first. The Jobs filters that apply to companies (direction, Open to Estonia)
 * work the same way and live in the URL; each row links to that company's jobs on Jobs (?company=).
 */
export default async function DiscoverPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { category, estonia } = parseFilters(sp);
  const sort = resolveCompanySort(typeof sp.sort === "string" ? sp.sort : "");
  const { rows, byDirection, total } = companyDirectory({ category, estonia, sort });
  const { cards } = getDataset();
  const directions = directionOrder(cards.map((c) => c.primary)).map((c) => ({ value: c, label: CATEGORY_META[c].short, count: byDirection[c] }));
  const hiring = rows.filter((r) => r.roles > 0).length;
  // Paged like Jobs: 50 rows, then "Load more" (the page stays in the URL, so a shared link holds it).
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1) || 1);
  const shown = rows.slice(0, page * PAGE_SIZE);
  const nextParams = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && k !== "page") nextParams.set(k, v);
  nextParams.set("page", String(page + 1));
  // Company links carry the page's own filters to Jobs.
  const jobsQuery = new URLSearchParams({ ...(category ? { category } : {}), ...(estonia ? { estonia: "1" } : {}) }).toString();

  return (
    <>
      <Band aria-label="Introduction" inner="grid gap-5 pb-10">
        <HeroTiles variant="discover" />
        <h1 className="max-w-[28ch]">Places that hire designers</h1>
        <p className="max-w-[60ch] text-lg leading-relaxed text-pretty text-muted-foreground">
          Some are hiring now, some are worth watching. Ping checks every one of them each morning.
        </p>
      </Band>

      <Band aria-labelledby={RESULTS_ID} inner="grid gap-6 py-8 sm:py-10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          {/* Filter links scroll here and focus it (components/filter-link.tsx); the margin clears the sticky header. */}
          <h2 id={RESULTS_ID} tabIndex={-1} className="scroll-mt-20 outline-none">
            Who&rsquo;s hiring
          </h2>
          <Suspense>
            <ResultsTarget />
          </Suspense>
          <div className="baseline-row flex-wrap gap-x-5 gap-y-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-mono text-foreground">{rows.length.toLocaleString("en-GB")}</span> companies,{" "}
              <span className="font-mono text-foreground">{hiring.toLocaleString("en-GB")}</span> hiring now
            </p>
            <Suspense fallback={<CompanySortFallback sort={sort} />}>
              <CompanySortControl sort={sort} />
            </Suspense>
          </div>
        </div>

        <Suspense>
          <CompanyFilters directions={directions} total={total} />
        </Suspense>

        <ResultsFade signature={JSON.stringify({ category, estonia, sort })}>
          {rows.length ? (
            <div>
              <div className={cn("hidden border-b border-border-strong lg:block", ROW_BLEED)}>
                <div className={cn(COMPANY_GRID, "grid items-baseline py-2.5")}>
                  <DataLabel>Company</DataLabel>
                  <DataLabel>Design roles</DataLabel>
                  <span />
                </div>
              </div>
              <ul aria-label="Companies">
                {shown.map((r) => (
                  <CompanyRow key={r.key} row={r} jobsQuery={jobsQuery} />
                ))}
              </ul>
            </div>
          ) : (
            <Panel
              titleAs="p"
              title="Nothing here yet"
              className="max-w-prose"
              footer={
                <Button variant="outline" nativeButton={false} render={<FilterLink href="/discover" />}>
                  Show all companies
                </Button>
              }
            >
              <p className="text-base text-muted-foreground">No company fits all of these right now. Ping will keep sniffing around.</p>
            </Panel>
          )}
        </ResultsFade>

        {shown.length < rows.length && (
          <div className="baseline-row flex-wrap gap-4">
            <Button variant="outline" size="lg" nativeButton={false} render={<Link href={`/discover?${nextParams.toString()}`} scroll={false} />}>
              <ArrowDown data-icon="inline-start" />
              Load more
            </Button>
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-mono text-foreground">{shown.length.toLocaleString("en-GB")}</span> of{" "}
              <span className="font-mono text-foreground">{rows.length.toLocaleString("en-GB")}</span>
            </p>
          </div>
        )}
      </Band>
    </>
  );
}
