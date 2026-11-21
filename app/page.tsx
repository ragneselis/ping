import { ArrowDown, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Band } from "@/components/blueprint";
import { JobFilters, JobListHeader } from "@/components/job-filters";
import { JobRow } from "@/components/job-row";
import { Readout, type ReadoutItem } from "@/components/readout";
import { DispersingRules } from "@/components/rules";
import { HeroTiles } from "@/components/tiles";
import { Button } from "@/components/ui/button";
import { CATEGORY_META, REACH_DEFINITION } from "@/lib/categories";
import { CATEGORIES } from "@/lib/types";
import {
  applyFilters,
  getDataset,
  isNewPosting,
  parseFilters,
} from "@/lib/view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { absolute: "Jobs | Ping" } };

const PAGE_SIZE = 24;
type Search = Record<string, string | string[] | undefined>;

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const { cards, updatedAt } = getDataset();
  const updated = updatedAt
    ? new Date(updatedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
      })
    : "recently";
  const filters = parseFilters(sp);
  const page = Math.max(
    1,
    Number(typeof sp.page === "string" ? sp.page : 1) || 1,
  );

  const results = applyFilters(cards, filters);
  const shown = results.slice(0, page * PAGE_SIZE);
  // Category counts follow the other filters, so the chips tell you where the jobs are.
  const withoutCategory = applyFilters(cards, { ...filters, category: "" });
  const categoryCounts = CATEGORIES.map((c) => ({
    value: c,
    label: CATEGORY_META[c].short,
    count: withoutCategory.filter((j) => j.primary === c).length,
  }))
    .filter((c) => c.count > 0 || c.value === filters.category)
    .sort((a, b) => b.count - a.count);

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
      href: "/?sort=newest",
      mark: "new",
    },
    {
      value: estonia.toLocaleString("en-GB"),
      label: "Open to Estonia",
      href: "/?estonia=1",
      mark: "estonia",
    },
    {
      value: reach.toLocaleString("en-GB"),
      label: "Within reach",
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
      <Band aria-label="Introduction" inner="grid gap-8 pb-8 sm:gap-10">
        <HeroTiles variant="jobs" />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-end lg:gap-16">
          <div className="grid gap-5">
            <h1 className="max-w-[14ch] text-[clamp(2rem,10.5vw,2.75rem)] leading-[0.95] text-balance sm:text-6xl xl:text-7xl">
              Design jobs, minus the doomscrolling.
            </h1>
            <p className="max-w-prose text-lg leading-relaxed text-pretty text-muted-foreground">
              Every current design role we can find, sorted into nine
              directions.
              <span className="hidden sm:inline">
                {" "}
                The market is tough, not closed: here is where the doors are
                actually open.
              </span>
            </p>
          </div>
          {/* The real shortcut for an EKA graduate. Hidden on phones, where the readout links do the same job. */}
          <div className="hidden gap-4 border-t border-border-strong pt-4 lg:grid">
            <p className="font-heading text-lg font-semibold tracking-tight">
              Start here
            </p>
            <p className="text-muted-foreground">
              <span className="font-mono text-foreground">{both}</span> jobs are
              open to someone in Estonia and within reach for a graduate.
            </p>
            <Button
              className="w-fit"
              nativeButton={false}
              render={<Link href="/?estonia=1&level=reach" />}
            >
              Show me those
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </div>

        <Readout
          items={readout}
          rules
          note={`${REACH_DEFINITION} Updated ${updated}.`}
        />
      </Band>

      <Band aria-labelledby="jobs-heading" inner="grid gap-6 py-8 sm:py-10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 id="jobs-heading" className="text-3xl sm:text-4xl">
            Find your direction
          </h2>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono text-foreground">
              {results.length.toLocaleString("en-GB")}
            </span>{" "}
            jobs match
          </p>
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

      <Band aria-label="Jobs" last inner="grid gap-8 pb-16">
        {shown.length ? (
          <div>
            {/* The dispersing lines again, as the divider into the list. */}
            <DispersingRules className="mb-2" />
            <Suspense>
              <JobListHeader sort={filters.sort} />
            </Suspense>
            <ul aria-label="Jobs">
              {shown.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  isNew={isNewPosting(job.postedAt, now)}
                />
              ))}
            </ul>
          </div>
        ) : (
          <div className="grid max-w-prose justify-items-start gap-3 border-t border-border-strong py-6">
            <p className="font-heading text-xl font-semibold tracking-tight">
              Nothing here right now.
            </p>
            <p className="text-muted-foreground">
              That combination is quiet today. Try switching off a filter, or
              check back soon: new jobs arrive all the time.
            </p>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/" />}
            >
              Show all jobs
            </Button>
          </div>
        )}

        {shown.length < results.length && (
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
              <span className="font-mono text-foreground">{shown.length}</span>{" "}
              of{" "}
              <span className="font-mono text-foreground">
                {results.length}
              </span>
            </p>
          </div>
        )}
      </Band>
    </>
  );
}
