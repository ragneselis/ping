import { ArrowRight, Briefcase, CalendarClock, Clock, Globe2, GraduationCap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CategoryHiringChart, DistributionChart, RankingChart } from "@/components/insight-charts";
import { CategoryDot, ChipContent, chipClassName } from "@/components/category";
import { ChipScroller } from "@/components/chip-scroller";
import { CountList, EARLY_SIGNAL_LINE, EarlySignalBadge } from "@/components/early-signal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CATEGORY_META, categoryColor, categoryVars } from "@/lib/categories";
import { CATEGORY_LABEL, type Category } from "@/lib/types";
import { categoryComparison, getDataset, insightFor, isEarlySignal, parseFilters, REACH } from "@/lib/view";

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
  const reachShare = scope.length ? Math.round((i.withinReach / scope.length) * 100) : 0;
  const early = !!category && isEarlySignal(scope.length);
  // A single direction's charts use its own colour; "All directions" keeps the chart tokens.
  const colors = category
    ? { skills: categoryColor(category), tools: categoryColor(category), seniority: categoryColor(category), years: categoryColor(category) }
    : { skills: 1, tools: 2, seniority: 3, years: 4 } as const;

  const keyStats = [
    { icon: Briefcase, value: i.postings.toLocaleString("en-GB"), label: "current postings" },
    { icon: Clock, value: i.medianYears === null ? "n/a" : `${i.medianYears} yrs`, label: "typical experience asked" },
    { icon: GraduationCap, value: `${reachShare}%`, label: "within reach for graduates" },
    { icon: Globe2, value: i.openToEstonia.toLocaleString("en-GB"), label: "open to someone in Estonia" },
  ];

  return (
    <div className="grid gap-12 pt-10 sm:pt-14">
      <section className="grid gap-4">
        <p className="font-mono text-sm font-medium text-muted-foreground">Market insights</p>
        <h1 className="text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-5xl">What the market is asking for</h1>
        <p className="max-w-2xl text-lg text-pretty text-muted-foreground">
          We read the requirements in every posting and counted them up. No guesswork, no hype: this is what employers
          actually write down, so you can spend your portfolio time where it counts.
        </p>
        <p className="flex items-start gap-2 font-mono text-xs text-muted-foreground">
          <CalendarClock className="mt-px size-3.5 shrink-0" />
          <span>
            Based on {jobs.length.toLocaleString("en-GB")} current postings from {boards} job boards and {companyFeeds} company career pages.
            Last updated {fmtDate(updatedAt)}.
          </span>
        </p>
      </section>

      {/* ---------- Direction picker ---------- */}
      <section className="grid gap-6" aria-labelledby="asks-heading">
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="asks-heading" className="flex items-center gap-3 text-2xl font-bold tracking-tight">
              {category && <CategoryDot category={category} className="size-3" />}
              {category ? CATEGORY_LABEL[category] : "All directions"}
            </h2>
            {early && <EarlySignalBadge />}
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

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {keyStats.map((s) => (
            <Card key={s.label} size="sm">
              <CardContent className="grid gap-1">
                <s.icon className="size-4 text-muted-foreground" />
                <div className="font-mono text-2xl font-semibold tabular-nums sm:text-3xl">{s.value}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {early ? (
          <Card>
            <CardContent className="grid gap-8 md:grid-cols-3">
              <CountList title="Skills mentioned" items={i.skills} total={i.withRequirements} empty="No skills listed yet." />
              <CountList title="Tools mentioned" items={i.tools} total={i.withRequirements} empty="No tools named yet." />
              <CountList
                title="Levels"
                items={i.seniority.filter((s) => s.count > 0)}
                total={i.postings}
                empty="No levels stated yet."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Most requested skills</CardTitle>
                <CardDescription>Share of postings that mention each skill</CardDescription>
              </CardHeader>
              <CardContent>
                <RankingChart data={i.skills} color={colors.skills} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Most requested tools</CardTitle>
                <CardDescription>Share of postings that name each tool</CardDescription>
              </CardHeader>
              <CardContent>
                <RankingChart data={i.tools} color={colors.tools} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Seniority</CardTitle>
                <CardDescription>How many roles sit at each level. &ldquo;Not stated&rdquo; often means open to a range.</CardDescription>
              </CardHeader>
              <CardContent>
                <DistributionChart data={i.seniority} color={colors.seniority} label="Postings" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Years of experience asked</CardTitle>
                <CardDescription>
                  Minimum years, where stated ({i.statedYears.toLocaleString("en-GB")} of {i.withRequirements.toLocaleString("en-GB")} postings). Treat it
                  as a wish list, not a wall.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DistributionChart data={i.years} color={colors.years} label="Postings" />
              </CardContent>
            </Card>
          </div>
        )}
        {category && (
          <Link href={`/?category=${category}`} className="flex w-fit items-center gap-1.5 font-medium text-primary hover:underline">
            See the {i.postings} {lowerFirst(CATEGORY_META[category].short)} jobs <ArrowRight className="size-4" />
          </Link>
        )}
      </section>

      <Separator />

      {/* ---------- Category comparison ---------- */}
      <section className="grid gap-6" aria-labelledby="compare-heading">
        <div className="grid gap-2">
          <h2 id="compare-heading" className="text-2xl font-bold tracking-tight">
            Which directions are hiring
          </h2>
          <p className="max-w-2xl text-muted-foreground">
            How many roles each direction has right now, and how many of them a graduate can realistically go for.{" "}
            {CATEGORY_META[comparison[0].category].short} leads on volume right now, followed by{" "}
            {lowerFirst(CATEGORY_META[comparison[1].category].short)}. The smaller directions often ask for more specialist skills.
          </p>
        </div>
        <Card>
          <CardContent>
            <CategoryHiringChart
              data={comparison.map((c) => {
                const reach = jobs.filter((j) => j.primary === c.category && REACH.has(j.seniority)).length;
                return { label: CATEGORY_META[c.category].short, reach, rest: c.postings - reach, color: categoryColor(c.category) };
              })}
            />
          </CardContent>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {comparison.map((c) => (
            <Link
              key={c.category}
              href={`/insights?category=${c.category}`}
              className="group row-span-3 grid grid-rows-subgrid gap-0 focus-visible:outline-none"
            >
              {/* Subgrid rows (description, stats, chips) keep cards in the same row aligned. */}
              <Card
                style={categoryVars(c.category)}
                className="row-span-3 grid grid-rows-subgrid border-t-4 border-t-(--cat) transition-shadow group-hover:shadow-lg group-focus-visible:ring-3 group-focus-visible:ring-ring/50">
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
                  <dl className="grid grid-cols-3 gap-2 text-center">
                    <Stat label="within reach" value={`${c.withinReachShare}%`} />
                    <Stat label="years asked" value={c.medianYears === null ? "n/a" : String(c.medianYears)} />
                    <Stat label="open to EE" value={String(c.openToEstonia)} />
                  </dl>
                </CardContent>
                <CardContent>
                  {c.topSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {[...c.topSkills, ...c.topTools].map((s) => (
                        <Badge key={s} variant="secondary" className="font-mono">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse rounded-lg bg-muted px-2 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-mono text-lg font-semibold">{value}</dd>
    </div>
  );
}
