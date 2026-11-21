import { ArrowDown, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Band } from "@/components/blueprint";
import {
  JobFilters,
  JobListHeader,
  SortControl,
  SortControlFallback,
} from "@/components/job-filters";
import { JobRow } from "@/components/job-row";
import { DataNote } from "@/components/data-note";
import { Panel } from "@/components/panel";
import { Readout, type ReadoutItem } from "@/components/readout";
import { ResultsFade } from "@/components/results-fade";
import { HeroTiles } from "@/components/tiles";
import { Button } from "@/components/ui/button";
import { CATEGORY_META, REACH_DEFINITION } from "@/lib/categories";
import {
  applyFilters,
  directionOrder,
  type Filters,
  formatUpdated,
  getDataset,
  groupSimilar,
  isNewPosting,
  parseFilters,
} from "@/lib/view";
import { REMOTE_LABEL } from "@/lib/categories";
import { shareMetadata } from "@/lib/share";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
// The tab reads "Ping | Design jobs for EKA"; a shared Jobs link gets the longer share title.
export const metadata: Metadata = {
  title: { absolute: "Ping | Design jobs for EKA" },
  ...shareMetadata("Ping | Design jobs for EKA students"),
};

const PAGE_SIZE = 50;
type Search = Record<string, string | string[] | undefined>;

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const { cards, updatedAt, lastRun, nextRun } = getDataset();
  const updated = formatUpdated(updatedAt);
  const filters = parseFilters(sp);
  const page = Math.max(
    1,
    Number(typeof sp.page === "string" ? sp.page : 1) || 1,
  );

  const results = applyFilters(cards, filters);
  // Near-identical postings from one company fold into a single row; paging counts rows.
  const groups = groupSimilar(results);
  const shownGroups = groups.slice(0, page * PAGE_SIZE);
  const shownJobs = shownGroups.reduce((n, g) => n + 1 + g.similar.length, 0);
  // Tab counts follow the other filters, but the order is fixed (the same as Market insights)
  // and empty directions stay, dimmed with 0, so nothing moves under the cursor.
  const withoutCategory = applyFilters(cards, { ...filters, category: "", categories: [] });
  const categoryCounts = directionOrder(cards.map((c) => c.primary)).map(
    (c) => ({
      value: c,
      label: CATEGORY_META[c].short,
      count: withoutCategory.filter((j) => j.primary === c).length,
    }),
  );

  // Empty state: find the one filter whose removal brings the most jobs back.
  const culprit = results.length ? null : findCulprit(cards, filters, sp);

  const estonia = cards.filter((c) => c.openToEstonia).length;
  const reach = cards.filter((c) => c.withinReach).length;
  const both = cards.filter((c) => c.openToEstonia && c.withinReach).length;
  const now = Date.now();
  const fresh = cards.filter((c) => isNewPosting(c.postedAt, now)).length;
  const readout: ReadoutItem[] = [
    {
      value: cards.length.toLocaleString("en-GB"),
      label: "Design jobs live",
      href: "/",
    },
    {
      value: fresh.toLocaleString("en-GB"),
      label: "New today",
      good: fresh > 0,
      href: "/?sort=newest",
      mark: "new",
    },
    {
      value: estonia.toLocaleString("en-GB"),
      label: "Open to Estonia",
      good: estonia > 0,
      href: "/?estonia=1",
      mark: "estonia",
    },
    {
      value: reach.toLocaleString("en-GB"),
      label: "Within reach",
      good: reach > 0,
      href: "/?level=reach",
      mark: "reach",
    },
  ];

  const nextParams = new URLSearchParams();
  for (const [k, v] of Object.entries(sp))
    if (typeof v === "string" && k !== "page") nextParams.set(k, v);
  nextParams.set("page", String(page + 1));

  return (
    <>
      <Band aria-label="Introduction" inner="grid gap-8 sm:gap-10">
        <HeroTiles variant="jobs" />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-end lg:gap-16">
          <div className="grid gap-5">
            <h1 className="max-w-[28ch]">
              Every current design role sorted into nine directions
            </h1>
            <p className="max-w-prose text-lg leading-relaxed text-pretty text-muted-foreground">
              {REACH_DEFINITION}
            </p>
            <DataNote postings={cards.length} lastRun={lastRun} nextRun={nextRun} />
          </div>
          {/* The real shortcut for an EKA graduate, on every screen size. */}
          <Panel
            titleAs="p"
            title="Start here"
            footer={
              <Button
                nativeButton={false}
                render={<Link href="/?estonia=1&level=reach" />}
              >
                Show me those
                <ArrowRight data-icon="inline-end" />
              </Button>
            }
          >
            <p className="text-base text-muted-foreground">
              <span className="font-mono text-foreground">{both}</span> jobs are
              open to someone in Estonia and within reach for a graduate.
            </p>
          </Panel>
        </div>

        <Readout items={readout} rules />
      </Band>

      <Band aria-labelledby="jobs-heading" inner="grid gap-6 py-8 sm:py-10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 id="jobs-heading">Find your direction</h2>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-mono text-foreground">
                {results.length.toLocaleString("en-GB")}
              </span>{" "}
              jobs match
            </p>
            <Suspense fallback={<SortControlFallback sort={filters.sort} />}>
              <SortControl sort={filters.sort} />
            </Suspense>
          </div>
        </div>

        <Suspense>
          <JobFilters
            categories={categoryCounts}
            total={withoutCategory.length}
          />
        </Suspense>

        {filters.category && (
          <p className="max-w-prose text-sm text-muted-foreground">
            {CATEGORY_META[filters.category].blurb}
          </p>
        )}
      </Band>

      <Band aria-label="Jobs" inner="grid gap-8 pb-16">
        <ResultsFade
          signature={JSON.stringify({ ...filters, page: undefined })}
        >
          {shownGroups.length ? (
            <div>
              <Suspense>
                <JobListHeader sort={filters.sort} />
              </Suspense>
              <ul aria-label="Jobs">
                {shownGroups.map(({ lead, similar }, n) => (
                  <JobRow
                    key={lead.id}
                    job={lead}
                    similar={similar}
                    reveal={n < 12 ? n : undefined}
                    isNew={isNewPosting(lead.postedAt, now)}
                  />
                ))}
              </ul>
            </div>
          ) : (
            <Panel
              titleAs="p"
              title="Nothing here right now"
              className="max-w-prose"
              footer={
                <div className="flex flex-wrap gap-3">
                  {culprit && (
                    <Button
                      nativeButton={false}
                      render={<Link href={culprit.href} scroll={false} />}
                    >
                      Remove {culprit.label}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={
                      <Link
                        href={filters.sort ? `/?sort=${filters.sort}` : "/"}
                      />
                    }
                  >
                    Show all jobs
                  </Button>
                </div>
              }
            >
              <p className="text-base text-muted-foreground">
                {culprit ? (
                  <>
                    No jobs match all of these filters together. Removing{" "}
                    <span className="font-medium text-foreground">
                      {culprit.label}
                    </span>{" "}
                    brings back{" "}
                    <span className="font-mono text-foreground">
                      {culprit.count.toLocaleString("en-GB")}
                    </span>
                    .
                  </>
                ) : (
                  <>
                    That combination is quiet today. Check back soon: new jobs
                    arrive all the time.
                  </>
                )}
              </p>
            </Panel>
          )}
        </ResultsFade>

        {shownGroups.length < groups.length && (
          <div className="flex flex-wrap items-center gap-4">
            <Button
              variant="outline"
              size="lg"
              nativeButton={false}
              render={
                <Link href={`/?${nextParams.toString()}`} scroll={false} />
              }
            >
              <ArrowDown data-icon="inline-start" />
              Load more
            </Button>
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-mono text-foreground">
                {shownJobs.toLocaleString("en-GB")}
              </span>{" "}
              of{" "}
              <span className="font-mono text-foreground">
                {results.length.toLocaleString("en-GB")}
              </span>
            </p>
          </div>
        )}
      </Band>
    </>
  );
}

/**
 * For an empty result: the single active filter whose removal brings back the most jobs,
 * with a link that removes just that one (sort and the rest stay).
 */
function findCulprit(
  cards: Parameters<typeof applyFilters>[0],
  f: Filters,
  sp: Search,
) {
  const LEVEL_NAME = {
    reach: "Within reach",
    mid: "Mid",
    senior: "Senior",
  } as const;
  const options: { label: string; drop: string[]; next: Filters }[] = [];
  if (f.q)
    options.push({
      label: `the search \u201c${f.q}\u201d`,
      drop: ["q"],
      next: { ...f, q: "" },
    });
  if (f.categories.length)
    options.push({
      label: f.categories.map((c) => CATEGORY_META[c].short).join(" and "),
      drop: ["category"],
      next: { ...f, category: "", categories: [] },
    });
  if (f.estonia)
    options.push({
      label: "Open to Estonia",
      drop: ["estonia"],
      next: { ...f, estonia: false },
    });
  if (f.remote)
    options.push({
      label: REMOTE_LABEL[f.remote] ?? f.remote,
      drop: ["remote"],
      next: { ...f, remote: "" },
    });
  if (f.levels.length)
    options.push({
      label: f.levels.map((l) => LEVEL_NAME[l]).join(" and "),
      drop: ["level", "reach"],
      next: { ...f, levels: [] },
    });
  const best = options
    .map((o) => ({ ...o, count: applyFilters(cards, o.next).length }))
    .filter((o) => o.count > 0)
    .sort((a, b) => b.count - a.count)[0];
  if (!best) return null;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp))
    if (typeof v === "string" && k !== "page" && !best.drop.includes(k))
      params.set(k, v);
  const qs = params.toString();
  return { label: best.label, count: best.count, href: qs ? `/?${qs}` : "/" };
}
