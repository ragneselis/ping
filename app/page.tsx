import { ArrowDown, BellRing, Compass, GraduationCap, Globe2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { JobCard } from "@/components/job-card";
import { JobFilters } from "@/components/job-filters";
import { SubscribeDialog } from "@/components/subscribe-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_META } from "@/lib/categories";
import { CATEGORIES } from "@/lib/types";
import { applyFilters, getDataset, parseFilters } from "@/lib/view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { absolute: "Jobs | Ping" } };

const PAGE_SIZE = 24;
type Search = Record<string, string | string[] | undefined>;

export default async function JobsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { cards } = getDataset();
  const filters = parseFilters(sp);
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1) || 1);

  const results = applyFilters(cards, filters);
  const shown = results.slice(0, page * PAGE_SIZE);
  // Category counts follow the other filters, so the chips tell you where the jobs are.
  const withoutCategory = applyFilters(cards, { ...filters, category: "" });
  const categoryCounts = CATEGORIES.map((c) => ({ value: c, label: CATEGORY_META[c].short, count: withoutCategory.filter((j) => j.primary === c).length }))
    .filter((c) => c.count > 0 || c.value === filters.category)
    .sort((a, b) => b.count - a.count);

  const stats = [
    { icon: Compass, value: cards.length, label: "design jobs right now" },
    { icon: Globe2, value: cards.filter((c) => c.openToEstonia).length, label: "open to someone in Estonia" },
    { icon: GraduationCap, value: cards.filter((c) => c.withinReach).length, label: "within reach for graduates" },
  ];

  const nextParams = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && k !== "page") nextParams.set(k, v);
  nextParams.set("page", String(page + 1));

  return (
    <div className="grid gap-10 pt-10 sm:pt-14">
      <section className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div className="grid gap-4">
          <p className="font-mono text-sm font-medium text-primary">For design students at EKA</p>
          <h1 className="text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-5xl">
            Design jobs, minus the doomscrolling.
          </h1>
          <p className="max-w-xl text-lg text-pretty text-muted-foreground">
            Every current design role we can find, sorted into nine directions. The market is tough, not closed: here is
            where the doors are actually open.
          </p>
        </div>
        <Card className="bg-secondary">
          <CardContent className="grid gap-3">
            <div className="flex items-center gap-2 font-semibold">
              <BellRing className="size-4 text-primary" />
              Never miss a new one
            </div>
            <p className="text-sm text-muted-foreground">Get new jobs in your direction as they land, by email or Slack.</p>
            <SubscribeDialog trigger={<Button className="w-fit">Get new jobs</Button>} />
          </CardContent>
        </Card>
      </section>

      <section aria-label="Live stats" className="grid grid-cols-3 gap-2 sm:gap-3">
        {stats.map((s) => (
          <Card key={s.label} size="sm">
            <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground sm:size-10">
                <s.icon className="size-4 sm:size-5" />
              </div>
              <div>
                <div className="font-mono text-2xl leading-none font-semibold tabular-nums sm:text-3xl">{s.value.toLocaleString("en-GB")}</div>
                <div className="mt-1 text-xs leading-snug text-muted-foreground sm:text-sm">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section aria-labelledby="jobs-heading" className="grid gap-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="jobs-heading" className="text-2xl font-bold tracking-tight">
            Find your direction
          </h2>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono font-semibold text-foreground">{results.length.toLocaleString("en-GB")}</span> jobs match, newest first
          </p>
        </div>

        <Suspense>
          <JobFilters categories={categoryCounts} total={withoutCategory.length} />
        </Suspense>

        {filters.category && (
          <p className="-mt-2 text-sm text-muted-foreground">{CATEGORY_META[filters.category].blurb}</p>
        )}

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
      </section>
    </div>
  );
}
