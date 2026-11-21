import { ArrowRight } from "lucide-react";
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
import { DataNote } from "@/components/data-note";
import { Panel } from "@/components/panel";
import { cn } from "@/lib/utils";
import {
  CATEGORY_META,
  categoryColor,
  REACH_DEFINITION,
} from "@/lib/categories";
import { CATEGORY_LABEL, type Category } from "@/lib/types";
import {
  categoryComparison,
  formatUpdated,
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
      label: "Design jobs live",
      href: filterHref("") || "/",
    },
    early
      ? {
          value: `${i.withinReach} of ${i.postings}`,
          label: "Within reach",
          href: filterHref("level=reach"),
          mark: "reach",
          good: i.withinReach > 0,
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
          good: i.openToEstonia > 0,
        }
      : {
          value: i.openToEstonia.toLocaleString("en-GB"),
          label: "Open to Estonia",
          href: filterHref("estonia=1"),
          mark: "estonia",
          good: i.openToEstonia > 0,
        },
    {
      value: i.medianYears === null ? "n/a" : `${i.medianYears} yrs`,
      label: early
        ? `Years asked, from ${i.statedYears} posting${i.statedYears === 1 ? "" : "s"}`
        : "Typical experience asked",
      muted: early,
      hint: "A wish list, not a wall.",
    },
  ];

  return (
    <>
      <Band aria-label="Introduction" inner="grid gap-5 pb-10">
        <HeroTiles variant="insights" />
        <h1 className="max-w-[28ch]">What design roles ask for right now</h1>
        <p className="max-w-[60ch] text-lg leading-relaxed text-pretty text-muted-foreground">
          Skills, tools and experience from every current posting, counted and
          split by direction.
        </p>
        <DataNote postings={jobs.length} updatedAt={updatedAt} />
      </Band>

      {/* ---------- One direction (or all) ---------- */}
      <Band aria-labelledby="asks-heading" inner="grid gap-6 py-8 sm:py-10">
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2
                id="asks-heading"
                className="scroll-mt-24 flex items-center gap-3"
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
              : "Every design role on Ping, all nine directions together."}
          </p>
          {early && (
            <p className="text-sm text-muted-foreground">{EARLY_SIGNAL_LINE}</p>
          )}
          <TabRow as="nav" label="Direction" activeKey={category}>
            <DirectionLink
              href="/insights"
              active={!category}
              label="All directions"
              count={jobs.length}
            />
            {comparison.map((c) => (
              <DirectionLink
                key={c.category}
                href={`/insights?category=${c.category}`}
                active={category === c.category}
                label={CATEGORY_META[c.category].short}
                category={c.category}
                count={c.postings}
              />
            ))}
          </TabRow>
        </div>

        <Readout items={readout} rules note={REACH_DEFINITION} />

        {early ? (
          <Panel bodyClassName="grid gap-8 md:grid-cols-3">
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
          </Panel>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3 4xl:grid-cols-4">
            {byDirection && (
              <p className="text-sm text-muted-foreground lg:col-span-2 xl:col-span-3 4xl:col-span-4">
                Every direction together. Hover or tap a bar to see how it
                splits by direction.
              </p>
            )}
            <Panel
              title="Most requested skills"
              description={<>Share of postings that mention each skill</>}
            >
              <RankingChart
                data={i.skills}
                color={color}
                byDirection={byDirection}
                caption="Most requested skills, share of postings"
              />
            </Panel>
            <Panel
              title="Most requested tools"
              description={<>Share of postings that name each tool</>}
            >
              <RankingChart
                data={i.tools}
                color={color}
                byDirection={byDirection}
                caption="Most requested tools, share of postings"
              />
            </Panel>
            <Panel
              bodyClassName="flex flex-1 flex-col"
              title="Seniority"
              description={
                <>
                  How many roles sit at each level. &ldquo;Not stated&rdquo;
                  often means open to a range.
                </>
              }
            >
              <DistributionChart
                fill
                data={i.seniority}
                color={color}
                byDirection={byDirection}
                label="Postings"
                caption="Postings per seniority level"
              />
            </Panel>
            <Panel
              className="xl:col-span-3 4xl:col-span-1"
              bodyClassName="flex flex-1 flex-col"
              title="Years of experience asked"
              description={
                <>
                  Minimum years, where stated (
                  {i.statedYears.toLocaleString("en-GB")} of{" "}
                  {i.withRequirements.toLocaleString("en-GB")} postings). Treat
                  it as a wish list, not a wall.
                </>
              }
            >
              <DistributionChart
                fill
                data={i.years}
                color={color}
                byDirection={byDirection}
                label="Postings"
                caption="Postings by minimum years of experience asked"
              />
            </Panel>
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
          <h2 id="compare-heading">Which directions are hiring</h2>
          <p className="max-w-prose text-muted-foreground">
            How many roles each direction has right now, and how many a graduate
            can realistically go for.{" "}
            {CATEGORY_META[comparison[0].category].short} leads on volume,
            followed by{" "}
            {lowerFirst(CATEGORY_META[comparison[1].category].short)}.
          </p>
        </div>
        <Panel>
          <CategoryHiringChart
            data={comparison.map((c) => ({
              label: CATEGORY_META[c.category].short,
              reach: c.withinReach,
              rest: c.postings - c.withinReach,
              color: categoryColor(c.category),
              href: `/insights?category=${c.category}`,
            }))}
          />
        </Panel>
        {/* Direction panels: the shared Panel, slot rows on a subgrid so neighbours line up.
            Hover turns the border the direction's colour, underlines the name and shows an arrow. */}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {comparison.map((c) => (
            <li key={c.category} className="row-span-4 grid grid-rows-subgrid">
              <Panel
                subgrid
                href={`/insights?category=${c.category}#asks-heading`}
                accent={categoryColor(c.category)}
                lead={
                  <CategoryDot category={c.category} className="size-2.5" />
                }
                title={CATEGORY_META[c.category].short}
                count={c.postings}
                description={
                  <div className="grid justify-items-start gap-3">
                    <p>{CATEGORY_META[c.category].blurb}</p>
                    {c.earlySignal && (
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                        <EarlySignalBadge />
                        <span>{EARLY_SIGNAL_LINE}</span>
                      </p>
                    )}
                  </div>
                }
                footer={
                  <div className="grid gap-1.5">
                    <span className="label-mono text-muted-foreground">
                      Top asks
                    </span>
                    <RequirementList
                      className="text-foreground/80"
                      items={[
                        ...c.topSkills.slice(0, 2),
                        ...c.topTools.slice(0, 2),
                      ]}
                    />
                  </div>
                }
              >
                {/* Within reach leads; Estonia and median years are secondary. */}
                <dl className="flex flex-wrap items-end gap-x-6 gap-y-3">
                  <div className="mr-2 grid gap-1.5">
                    <dt className="label-mono order-2 text-muted-foreground">
                      Within reach
                    </dt>
                    {/* Emerald only when there is good news; a zero stays in text colour. */}
                    <dd
                      className={cn(
                        "order-1 font-heading text-4xl leading-none font-semibold tracking-tight tabular-nums",
                        c.withinReach > 0 ? "text-brand-lg" : "text-foreground",
                      )}
                    >
                      {c.withinReach}
                    </dd>
                  </div>
                  {(
                    [
                      ["Open to Estonia", c.openToEstonia],
                      ["Median years", c.medianYears ?? "n/a"],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} className="grid gap-1 pb-0.5">
                      <dt className="order-2 text-xs text-muted-foreground">
                        {label}
                      </dt>
                      {/* An early signal's median rests on a handful of postings: muted, as in the readout. */}
                      <dd
                        className={cn(
                          "order-1 font-mono text-base leading-none tabular-nums",
                          label === "Median years" &&
                            c.earlySignal &&
                            "text-muted-foreground",
                        )}
                      >
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Panel>
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
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  category?: Category;
  count: number;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={tabClassName(active)}
    >
      <TabContent label={label} category={category} count={count} />
    </Link>
  );
}
