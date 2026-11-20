import { ArrowRight, CalendarClock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CategoryHiringChart, DistributionChart, RankingChart } from "@/components/insight-charts";
import { Band } from "@/components/blueprint";
import { CategoryDot, CategoryLegend, ChipContent, chipClassName } from "@/components/category";
import { ChipScroller } from "@/components/chip-scroller";
import { CountList, EARLY_SIGNAL_LINE, EarlySignalBadge } from "@/components/early-signal";
import { Readout, type ReadoutItem } from "@/components/readout";
import { RequirementChip } from "@/components/signal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_META, categoryColor, categoryVars, REACH_DEFINITION } from "@/lib/categories";
import { CATEGORY_LABEL, type Category } from "@/lib/types";
import { categoryComparison, getDataset, insightFor, isEarlySignal, parseFilters } from "@/lib/view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { absolute: "Market insights | Ping" } };

type Search = Record<string, string | string[] | undefined>;

/** "Product" -> "product" mid-sentence, but "AI and behaviour" keeps its acronym. */
const lowerFirst = (s: string) => (/^[A-Z]{2}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "recently";

export default async function InsightsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { category } = parseFilters(await searchParams);
  const { jobs, updatedAt, boards, companyFeeds } = getDataset();
  const scope = category ? jobs.filter((j) => j.primary === category) : jobs;
  const i = insightFor(scope, 10);
  const comparison = categoryComparison(jobs);
  const early = !!category && isEarlySignal(scope.length);
  // "All directions": bars stacked by direction (vivid category colours). One direction: its own colour.
  const color = category ? categoryColor(category) : undefined;
  const stacked = !category;
  const filterHref = (extra: string) => `/?${category ? `category=${category}&` : ""}${extra}`.replace(/[?&]$/, "");
  const pct = (n: number) => (scope.length ? `${Math.round((n / scope.length) * 100)}%` : "0%");

  // Early-signal directions show counts ("1 of 2"), never percentages or a confident median.
  const readout: ReadoutItem[] = [
    { value: i.postings.toLocaleString("en-GB"), label: "current postings", href: filterHref("") || "/" },
    early
      ? { value: `${i.withinReach} of ${i.postings}`, label: "within reach", href: filterHref("reach=1"), signal: true }
      : { value: pct(i.withinReach), label: `within reach (${i.withinReach.toLocaleString("en-GB")})`, href: filterHref("reach=1"), signal: true },
    early
      ? { value: `${i.openToEstonia} of ${i.postings}`, label: "open to Estonia", href: filterHref("estonia=1"), signal: true }
      : { value: i.openToEstonia.toLocaleString("en-GB"), label: "open to Estonia", href: filterHref("estonia=1"), signal: true },
    {
      value: i.medianYears === null ? "n/a" : `${i.medianYears} yrs`,
      label: early ? `years asked, from ${i.statedYears} posting${i.statedYears === 1 ? "" : "s"}` : "typical experience asked",
      muted: early,
    },
  ];

  return (
    <>
      <Band aria-label="Introduction" inner="grid gap-4 py-8 sm:py-12">
        <h1 className="text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-5xl">What the market is asking for</h1>
        <p className="max-w-xl text-lg text-pretty text-muted-foreground">
          We read the requirements in every posting and counted them up. No guesswork, no hype: this is what employers actually write down, so you
          can spend your portfolio time where it counts.
        </p>
        <p className="flex items-start gap-2 font-mono text-xs text-muted-foreground">
          <CalendarClock aria-hidden className="mt-px size-3.5 shrink-0" />
          <span>
            Based on {jobs.length.toLocaleString("en-GB")} current postings from {boards} job boards and {companyFeeds} company career pages. Last
            updated {fmtDate(updatedAt)}.
          </span>
        </p>
      </Band>

      {/* ---------- One direction (or all) ---------- */}
      <Band aria-labelledby="asks-heading" inner="grid gap-6 py-8 sm:py-10">
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 id="asks-heading" className="flex items-center gap-3 text-2xl font-bold tracking-tight">
                {category && <CategoryDot category={category} className="size-3" />}
                {category ? CATEGORY_LABEL[category] : "All directions"}
              </h2>
              {early && <EarlySignalBadge />}
            </div>
            {category && (
              <Button variant="outline" nativeButton={false} render={<Link href={`/?category=${category}`} />}>
                See the {i.postings} {lowerFirst(CATEGORY_META[category].short)} jobs
                <ArrowRight data-icon="inline-end" />
              </Button>
            )}
          </div>
          <p className="text-muted-foreground">{category ? CATEGORY_META[category].blurb : "Every design role we track, all nine directions together."}</p>
          {early && <p className="font-medium">{EARLY_SIGNAL_LINE}</p>}
          <ChipScroller as="nav" aria-label="Direction" activeKey={category}>
            <div className="flex w-max gap-2 md:w-auto md:flex-wrap">
              <DirectionLink href="/insights" active={!category} label="All directions" />
              {comparison.map((c) => (
                <DirectionLink
                  key={c.category}
                  href={`/insights?category=${c.category}`}
                  active={category === c.category}
                  label={CATEGORY_META[c.category].short}
                  category={c.category}
                />
              ))}
            </div>
          </ChipScroller>
        </div>

        <Readout items={readout} note={REACH_DEFINITION} />

        {early ? (
          <Card>
            <CardContent className="grid gap-8 md:grid-cols-3">
              <CountList title="Skills mentioned" items={i.skills} total={i.withRequirements} empty="No skills listed yet." />
              <CountList title="Tools mentioned" items={i.tools} total={i.withRequirements} empty="No tools named yet." />
              <CountList title="Levels" items={i.seniority.filter((s) => s.count > 0)} total={i.postings} empty="No levels stated yet." />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {stacked && (
              <div className="grid gap-1.5 lg:col-span-2">
                <p className="text-xs text-muted-foreground">Bars are split by each posting&rsquo;s main direction. Hover or tap a bar for the breakdown.</p>
                <CategoryLegend />
              </div>
            )}
            <Card>
              <CardHeader>
                <CardTitle>Most requested skills</CardTitle>
                <CardDescription>Share of postings that mention each skill</CardDescription>
              </CardHeader>
              <CardContent>
                <RankingChart data={i.skills} color={color} stacked={stacked} caption="Most requested skills, share of postings" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Most requested tools</CardTitle>
                <CardDescription>Share of postings that name each tool</CardDescription>
              </CardHeader>
              <CardContent>
                <RankingChart data={i.tools} color={color} stacked={stacked} caption="Most requested tools, share of postings" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Seniority</CardTitle>
                <CardDescription>How many roles sit at each level. &ldquo;Not stated&rdquo; often means open to a range.</CardDescription>
              </CardHeader>
              <CardContent>
                <DistributionChart data={i.seniority} color={color} stacked={stacked} label="Postings" caption="Postings per seniority level" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Years of experience asked</CardTitle>
                <CardDescription>
                  Minimum years, where stated ({i.statedYears.toLocaleString("en-GB")} of {i.withRequirements.toLocaleString("en-GB")} postings). Treat it as a
                  wish list, not a wall.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DistributionChart data={i.years} color={color} stacked={stacked} label="Postings" caption="Postings by minimum years of experience asked" />
              </CardContent>
            </Card>
          </div>
        )}
      </Band>

      {/* ---------- Direction comparison ---------- */}
      <Band aria-labelledby="compare-heading" last inner="grid gap-6 py-8 pb-16 sm:py-10">
        <div className="grid gap-2">
          <h2 id="compare-heading" className="text-2xl font-bold tracking-tight">
            Which directions are hiring
          </h2>
          <p className="max-w-xl text-muted-foreground">
            How many roles each direction has right now, and how many a graduate can realistically go for.{" "}
            {CATEGORY_META[comparison[0].category].short} leads on volume, followed by {lowerFirst(CATEGORY_META[comparison[1].category].short)}.
          </p>
        </div>
        <Card>
          <CardContent>
            <CategoryHiringChart
              data={comparison.map((c) => ({
                label: CATEGORY_META[c.category].short,
                reach: c.withinReach,
                rest: c.postings - c.withinReach,
                color: categoryColor(c.category),
                href: `/insights?category=${c.category}`,
              }))}
            />
          </CardContent>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {comparison.map((c) => (
            <Link key={c.category} href={`/insights?category=${c.category}`} className="group row-span-3 grid grid-rows-subgrid focus-visible:outline-none">
              {/* Subgrid rows (name and blurb, numbers, chips) keep cards in the same row aligned. */}
              <Card className="row-span-3 grid grid-rows-subgrid gap-3 transition-colors group-hover:[--cut-line:var(--color-primary)] group-focus-visible:[--cut-line:var(--color-ring)]">
                <CardHeader className="content-start">
                  <CardTitle className="flex items-center justify-between gap-2 group-hover:text-primary">
                    <span className="flex items-center gap-2">
                      <CategoryDot category={c.category} className="size-2.5" />
                      {CATEGORY_META[c.category].short}
                    </span>
                    <span className="font-mono text-sm text-muted-foreground">{c.postings}</span>
                  </CardTitle>
                  <CardDescription>{CATEGORY_META[c.category].blurb}</CardDescription>
                  {c.earlySignal && (
                    <div className="grid justify-items-start gap-1.5 pt-1">
                      <EarlySignalBadge />
                      <p className="text-sm font-medium">{EARLY_SIGNAL_LINE}</p>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="font-mono text-xs text-muted-foreground">
                    <span className="text-foreground">{c.withinReach}</span> within reach,{" "}
                    <span className="text-foreground">{c.openToEstonia}</span> open to Estonia,{" "}
                    <span className="text-foreground">{c.medianYears ?? "n/a"}</span> yrs median
                  </p>
                </CardContent>
                <CardContent>
                  {c.topSkills.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5" aria-label="Top requirements">
                      {[...c.topSkills.slice(0, 2), ...c.topTools.slice(0, 2)].map((s) => (
                        <RequirementChip key={s}>{s}</RequirementChip>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </Band>
    </>
  );
}

function DirectionLink({ href, active, label, category }: { href: string; active: boolean; label: string; category?: Category }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      style={category ? categoryVars(category) : undefined}
      className={chipClassName(active, category)}
    >
      <ChipContent label={label} active={active} category={category} />
    </Link>
  );
}

