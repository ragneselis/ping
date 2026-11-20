import { ArrowDown, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Band } from "@/components/blueprint";
import { JobCard } from "@/components/job-card";
import { JobFilters } from "@/components/job-filters";
import { Readout, type ReadoutItem } from "@/components/readout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_META, REACH_DEFINITION } from "@/lib/categories";
import { CATEGORIES } from "@/lib/types";
import { applyFilters, getDataset, parseFilters } from "@/lib/view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { absolute: "Jobs | Ping" } };

const PAGE_SIZE = 24;
type Search = Record<string, string | string[] | undefined>;

export default async function JobsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { cards, updatedAt } = getDataset();
  const updated = updatedAt ? new Date(updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" }) : "recently";
  const filters = parseFilters(sp);
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1) || 1);

  const results = applyFilters(cards, filters);
  const shown = results.slice(0, page * PAGE_SIZE);
  // Category counts follow the other filters, so the chips tell you where the jobs are.
  const withoutCategory = applyFilters(cards, { ...filters, category: "" });
  const categoryCounts = CATEGORIES.map((c) => ({ value: c, label: CATEGORY_META[c].short, count: withoutCategory.filter((j) => j.primary === c).length }))
    .filter((c) => c.count > 0 || c.value === filters.category)
    .sort((a, b) => b.count - a.count);

  const estonia = cards.filter((c) => c.openToEstonia).length;
  const reach = cards.filter((c) => c.withinReach).length;
  const both = cards.filter((c) => c.openToEstonia && c.withinReach).length;
  const readout: ReadoutItem[] = [
    { value: cards.length.toLocaleString("en-GB"), label: "design jobs live", href: "/" },
    { value: estonia.toLocaleString("en-GB"), label: "open to Estonia", href: "/?estonia=1", signal: true },
    { value: reach.toLocaleString("en-GB"), label: "within reach", href: "/?reach=1", signal: true },
  ];

  const nextParams = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && k !== "page") nextParams.set(k, v);
  nextParams.set("page", String(page + 1));

  return (
    <>
      <Band aria-label="Introduction" inner="grid gap-8 py-8 sm:py-12">
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div className="grid gap-4">
          <h1 className="text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-5xl">Design jobs, minus the doomscrolling.</h1>
          <p className="max-w-xl text-lg text-pretty text-muted-foreground">
            Every current design role we can find, sorted into nine directions.
            <span className="hidden sm:inline"> The market is tough, not closed: here is where the doors are actually open.</span>
          </p>
        </div>
        {/* The real shortcut for an EKA graduate. Hidden on phones, where the readout links do the same job. */}
        <Card className="hidden lg:flex">
          <CardContent className="grid gap-3">
            <p className="font-semibold">Start here</p>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono font-semibold text-foreground">{both}</span> jobs are open to someone in Estonia and within reach for a
              graduate.
            </p>
            <Button className="w-fit" nativeButton={false} render={<Link href="/?estonia=1&reach=1" />}>
              Show me those
              <ArrowRight data-icon="inline-end" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <Readout items={readout} note={`${REACH_DEFINITION} Updated ${updated}.`} />
      </Band>

      <Band aria-labelledby="jobs-heading" inner="grid gap-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="jobs-heading" className="text-2xl font-bold tracking-tight">
            Find your direction
          </h2>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono font-semibold text-foreground">{results.length.toLocaleString("en-GB")}</span> jobs match, within reach first
          </p>
        </div>

        <Suspense>
          <JobFilters categories={categoryCounts} total={withoutCategory.length} />
        </Suspense>

        {filters.category && (
          <p className="-mt-2 text-sm text-muted-foreground">{CATEGORY_META[filters.category].blurb}</p>
        )}

      </Band>

      <Band aria-label="Jobs" last inner="grid gap-6 py-8 pb-16">
        {shown.length ? (
          <div className="grid gap-x-4 gap-y-4 md:grid-cols-2">
            {shown.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="grid justify-items-start gap-2 py-6">
              <p className="text-lg font-semibold">Nothing here right now.</p>
              <p className="text-muted-foreground">
                That combination is quiet today. Try switching off a filter, or check back soon: new jobs arrive all the time.
              </p>
              <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
                Show all jobs
              </Button>
            </CardContent>
          </Card>
        )}

        {shown.length < results.length && (
          <div className="flex flex-col items-center gap-2">
            <Button variant="outline" size="lg" nativeButton={false} render={<Link href={`/?${nextParams.toString()}`} scroll={false} />}>
              <ArrowDown data-icon="inline-start" />
              Load more
            </Button>
            <p className="font-mono text-xs text-muted-foreground">
              Showing {shown.length} of {results.length}
            </p>
          </div>
        )}
      </Band>
    </>
  );
}
