import { ArrowDown } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Band } from "@/components/blueprint";
import { CompanyFilters } from "@/components/company-filters";
import { COMPANY_GRID, CompanyRow } from "@/components/company-row";
import { DataNote } from "@/components/data-note";
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
import { companyDirectory, directionOrder, getDataset, parseFilters } from "@/lib/view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "Discover | Ping" },
  ...shareMetadata("Discover | Ping"),
};

type Search = Record<string, string | string[] | undefined>;

const PAGE_SIZE = 50;

/**
 * Discover: a map of who hires designers in Estonia (lib/view.ts, companyDirectory). Companies with open
 * design roles first, most roles first, then everyone else A to Z. The direction tabs work as on Jobs and
 * live in the URL; each row links to that company's jobs on Jobs (?company=) and to its careers page.
 */
export default async function DiscoverPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { category } = parseFilters(sp);
  const { rows, byDirection, total } = companyDirectory({ category });
  const { cards, lastRun } = getDataset();
  const directions = directionOrder(cards.map((c) => c.primary)).map((c) => ({ value: c, label: CATEGORY_META[c].short, count: byDirection[c] }));
  const hiring = rows.filter((r) => r.roles > 0).length;
  // Paged like Jobs: 50 rows, then "Load more" (the page stays in the URL, so a shared link holds it).
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1) || 1);
  const shown = rows.slice(0, page * PAGE_SIZE);
  const nextParams = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && k !== "page") nextParams.set(k, v);
  nextParams.set("page", String(page + 1));
  // Company links carry the page's own filters to Jobs.
  const jobsQuery = category ? `category=${category}` : "";

  return (
    <>
      <Band aria-label="Introduction" inner="grid gap-5 pb-10">
        <HeroTiles variant="discover" />
        <h1 className="max-w-[28ch]">Places Ping keeps an eye on</h1>
        <p className="max-w-[60ch] text-lg leading-relaxed text-muted-foreground">
          Places in Estonia that hire designers. Some are hiring now, some are worth watching, all worth an open application.
        </p>
        <DataNote lastRun={lastRun} roles={cards.length} />
      </Band>

      <Band aria-labelledby={RESULTS_ID} inner="grid gap-6 py-8 sm:py-10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          {/* Filter links scroll here and focus it (components/filter-link.tsx); the margin clears the sticky header. */}
          <h2 id={RESULTS_ID} tabIndex={-1} className="scroll-mt-20 outline-none">
            Hiring or quiet
          </h2>
          <Suspense>
            <ResultsTarget />
          </Suspense>
          <div className="baseline-row flex-wrap gap-x-5 gap-y-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-mono text-foreground">{rows.length.toLocaleString("en-GB")}</span> companies,{" "}
              <span className="font-mono text-foreground">{hiring.toLocaleString("en-GB")}</span> hiring now
            </p>
          </div>
        </div>

        <Suspense>
          <CompanyFilters directions={directions} total={total} />
        </Suspense>

        <ResultsFade signature={JSON.stringify({ category })}>
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
