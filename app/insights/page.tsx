import { ArrowRight, CalendarClock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  CategoryHiringChart,
  DistributionChart,
  RankingChart,
} from "@/components/insight-charts";
import { Band } from "@/components/blueprint";
import { CategoryDot } from "@/components/category";
import { TabContent, tabClassName } from "@/components/filter-controls";
import { TabRow } from "@/components/tab-row";
import {
  CountList,
  EARLY_SIGNAL_LINE,
  EarlySignalBadge,
} from "@/components/early-signal";
import { Readout, type ReadoutItem } from "@/components/readout";
import { HeroTiles } from "@/components/tiles";
import { RequirementList } from "@/components/signal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CATEGORY_META,
  categoryColor,
  REACH_DEFINITION,
} from "@/lib/categories";
import { CATEGORY_LABEL, type Category } from "@/lib/types";
import {
  categoryComparison,
  getDataset,
  insightFor,
  isEarlySignal,
  parseFilters,
} from "@/lib/view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "Market insights | Ping" },
};

type Search = Record<string, string | string[] | undefined>;

/** "Product" -> "product" mid-sentence, but "AI and behaviour" keeps its acronym. */
const lowerFirst = (s: string) =>
  /^[A-Z]{2}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1);

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "recently";

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { category } = parseFilters(await searchParams);
  const { jobs, updatedAt, boards, companyFeeds } = getDataset();
  const scope = category ? jobs.filter((j) => j.primary === category) : jobs;
  const i = insightFor(scope, 10);
  const comparison = categoryComparison(jobs);
  const early = !!category && isEarlySignal(scope.length);
  // "All directions": one brand-emerald bar each, split by direction in the tooltip. One direction: its own colour.
  const color = category ? categoryColor(category) : undefined;
  const byDirection = !category;
  const filterHref = (extra: string) =>
    `/?${category ? `category=${category}&` : ""}${extra}`.replace(/[?&]$/, "");
  const pct = (n: number) =>
    scope.length ? `${Math.round((n / scope.length) * 100)}%` : "0%";

  // Early-signal directions show counts ("1 of 2"), never percentages or a confident median.
  const readout: ReadoutItem[] = [
    {
      value: i.postings.toLocaleString("en-GB"),
      label: "Current postings",
      href: filterHref("") || "/",
    },
    early
      ? {
          value: `${i.withinReach} of ${i.postings}`,
          label: "Within reach",
          href: filterHref("level=reach"),
          mark: "reach",
        }
      : {
          value: pct(i.withinReach),
          label: `Within reach (${i.withinReach.toLocaleString("en-GB")})`,
          href: filterHref("level=reach"),
          mark: "reach",
        },
    early
      ? {
          value: `${i.openToEstonia} of ${i.postings}`,
          label: "Open to Estonia",
          href: filterHref("estonia=1"),
          mark: "estonia",
        }
      : {
          value: i.openToEstonia.toLocaleString("en-GB"),
          label: "Open to Estonia",
          href: filterHref("estonia=1"),
          mark: "estonia",
        },
    {
      value: i.medianYears === null ? "n/a" : `${i.medianYears} yrs`,
      label: early
        ? `Years asked, from ${i.statedYears} posting${i.statedYears === 1 ? "" : "s"}`
        : "Typical experience asked",
      muted: early,
    },
  ];

  return (
    <>
      <Band aria-label="Introduction" inner="grid gap-5 pb-10">
        <HeroTiles variant="insights" />
        <h1 className="max-w-[16ch] text-[clamp(2rem,10.5vw,2.75rem)] leading-[1.05] text-balance sm:text-6xl xl:text-7xl">
          What the market is asking for
        </h1>
        <p className="max-w-prose text-lg leading-relaxed text-pretty text-muted-foreground">
          We read the requirements in every posting and counted them up. No
          guesswork, no hype: this is what employers actually write down, so you
          can spend your portfolio time where it counts.
        </p>
        <p className="flex max-w-prose items-start gap-2 text-sm text-muted-foreground">
          <CalendarClock
            aria-hidden
            className="mt-0.5 size-3.5 shrink-0"
            strokeWidth={1.75}
          />
          <span>
            Based on {jobs.length.toLocaleString("en-GB")} current postings from{" "}
            {boards} job boards and {companyFeeds} company career pages. Last
            updated {fmtDate(updatedAt)}.
          </span>
        </p>
      </Band>

      {/* ---------- One direction (or all) ---------- */}
      <Band aria-labelledby="asks-heading" inner="grid gap-6 py-8 sm:py-10">
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2
                id="asks-heading"
                className="flex items-center gap-3 text-3xl sm:text-4xl"
              >
                {category && (
                  <CategoryDot category={category} className="size-3" />
                )}
                {category ? CATEGORY_LABEL[category] : "All directions"}
              </h2>
              {early && <EarlySignalBadge />}
            </div>
            {category && (
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href={`/?category=${category}`} />}
              >
                See the {i.postings} {lowerFirst(CATEGORY_META[category].short)}{" "}
                jobs
                <ArrowRight data-icon="inline-end" />
              </Button>
            )}
          </div>
          <p className="max-w-prose text-muted-foreground">
            {category
              ? CATEGORY_META[category].blurb
              : "Every design role we track, all nine directions together."}
          </p>
          {early && <p className="font-medium">{EARLY_SIGNAL_LINE}</p>}
          <TabRow as="nav" label="Direction" activeKey={category}>
            <DirectionLink
              href="/insights"
              active={!category}
              label="All directions"
            />
            {comparison.map((c) => (
              <DirectionLink
                key={c.category}
                href={`/insights?category=${c.category}`}
                active={category === c.category}
                label={CATEGORY_META[c.category].short}
                category={c.category}
              />
            ))}
          </TabRow>
        </div>

        <Readout items={readout} rules note={REACH_DEFINITION} />

        {early ? (
          <Card>
            <CardContent className="grid gap-8 md:grid-cols-3">
              <CountList
                title="Skills mentioned"
                items={i.skills}
                total={i.withRequirements}
                empty="No skills listed yet."
              />
              <CountList
                title="Tools mentioned"
                items={i.tools}
                total={i.withRequirements}
                empty="No tools named yet."
              />
              <CountList
                title="Levels"
                items={i.seniority.filter((s) => s.count > 0)}
                total={i.postings}
                empty="No levels stated yet."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3 4xl:grid-cols-4">
            {byDirection && (
              <p className="text-sm text-muted-foreground lg:col-span-2 xl:col-span-3 4xl:col-span-4">
                Every direction together. Hover or tap a bar to see how it
                splits by direction.
              </p>
            )}
            <Card>
              <CardHeader>
                <CardTitle>Most requested skills</CardTitle>
                <CardDescription>
                  Share of postings that mention each skill
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RankingChart
                  data={i.skills}
                  color={color}
                  byDirection={byDirection}
                  caption="Most requested skills, share of postings"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Most requested tools</CardTitle>
                <CardDescription>
                  Share of postings that name each tool
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RankingChart
                  data={i.tools}
                  color={color}
                  byDirection={byDirection}
                  caption="Most requested tools, share of postings"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Seniority</CardTitle>
                <CardDescription>
                  How many roles sit at each level. &ldquo;Not stated&rdquo;
                  often means open to a range.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DistributionChart
                  data={i.seniority}
                  color={color}
                  byDirection={byDirection}
                  label="Postings"
                  caption="Postings per seniority level"
                />
              </CardContent>
            </Card>
            <Card className="xl:col-span-3 4xl:col-span-1">
              <CardHeader>
                <CardTitle>Years of experience asked</CardTitle>
                <CardDescription>
                  Minimum years, where stated (
                  {i.statedYears.toLocaleString("en-GB")} of{" "}
                  {i.withRequirements.toLocaleString("en-GB")} postings). Treat
                  it as a wish list, not a wall.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DistributionChart
                  data={i.years}
                  color={color}
                  byDirection={byDirection}
                  label="Postings"
                  caption="Postings by minimum years of experience asked"
                />
              </CardContent>
            </Card>
          </div>
        )}
      </Band>

      {/* ---------- Direction comparison ---------- */}
      <Band
        aria-labelledby="compare-heading"
        last
        inner="grid gap-6 py-8 pb-16 sm:py-10"
      >
        <div className="grid gap-2">
          <h2 id="compare-heading" className="text-3xl sm:text-4xl">
            Which directions are hiring
          </h2>
          <p className="max-w-prose text-muted-foreground">
            How many roles each direction has right now, and how many a graduate
            can realistically go for.{" "}
            {CATEGORY_META[comparison[0].category].short} leads on volume,
            followed by{" "}
            {lowerFirst(CATEGORY_META[comparison[1].category].short)}.
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
        {/* Per-direction blocks: a hairline grid; colour sits in each block's dot.
            Subgrid rows (name, blurb, numbers, requirements) keep blocks in the same row aligned. */}
        <ul className="grid gap-x-8 gap-y-0 sm:grid-cols-2 lg:grid-cols-3">
          {comparison.map((c) => (
            <li
              key={c.category}
              className="row-span-4 grid grid-rows-subgrid border-t border-hairline-strong"
            >
              <Link
                href={`/insights?category=${c.category}`}
                className="group row-span-4 grid grid-rows-subgrid gap-y-3 border-b border-border py-5 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="flex items-center gap-2 font-heading-text text-lg font-semibold underline-offset-4 group-hover:underline">
                    <CategoryDot category={c.category} className="size-2.5" />
                    {CATEGORY_META[c.category].short}
                  </span>
                  <span className="font-mono text-2xl tabular-nums">
                    {c.postings}
                  </span>
                </span>
                <span className="grid content-start justify-items-start gap-2">
                  <span className="max-w-prose text-sm text-muted-foreground">
                    {CATEGORY_META[c.category].blurb}
                  </span>
                  {c.earlySignal && (
                    <>
                      <EarlySignalBadge />
                      <span className="text-sm font-medium">
                        {EARLY_SIGNAL_LINE}
                      </span>
                    </>
                  )}
                </span>
                <dl className="grid grid-cols-3 content-start gap-3 border-t border-border pt-3">
                  {(
                    [
                      ["Within reach", c.withinReach],
                      ["Open to Estonia", c.openToEstonia],
                      ["Median years", c.medianYears ?? "n/a"],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} className="grid gap-0.5">
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="font-mono text-base tabular-nums">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <RequirementList
                  items={[
                    ...c.topSkills.slice(0, 2),
                    ...c.topTools.slice(0, 2),
                  ]}
                />
              </Link>
            </li>
          ))}
        </ul>
      </Band>
    </>
  );
}

function DirectionLink({
  href,
  active,
  label,
  category,
}: {
  href: string;
  active: boolean;
  label: string;
  category?: Category;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={tabClassName(active)}
    >
      <TabContent label={label} category={category} />
    </Link>
  );
}
