import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Band } from "@/components/blueprint";
import { Panel } from "@/components/panel";
import { Readout } from "@/components/readout";
import { DailyChart, Empty, Rank, RankList } from "@/components/stats/stats-charts";
import { SubscriberTable } from "@/components/stats/subscriber-table";
import { readStats } from "@/lib/server/stats";
import { isStatsAuthorized } from "@/lib/server/stats-auth";
import { describePrefs } from "@/lib/server/templates";
import { EMPTY_PREFS, FREQUENCY_LABEL, toFrequency } from "@/lib/subscription";
import { LogoutButton } from "./logout-button";
import { IconText } from "@/components/icon-text";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stats",
  robots: { index: false, follow: false },
};

/*
 * /stats: Ping's private back office. Behind STATS_PASSWORD (HTTP Basic Auth, as on ragne.me), in
 * middleware.ts and again here, so a change to the matcher cannot open it. Not linked from anywhere,
 * noindex, and not counted as a page view. Numbers are the anonymous daily counters (lib/usage.ts),
 * the subscribers table and the pipeline's data files.
 */

const n = (v: number) => v.toLocaleString("en-GB");
const TALLINN = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Tallinn", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const WEEKDAY = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Tallinn", weekday: "long" });
const TALLINN_DAY = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Tallinn", day: "numeric", month: "short", year: "numeric" });
const when = (iso: string | null) => (iso ? TALLINN.format(new Date(iso)) : "never");
const WEEK = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function Section({ id, title, intro, children }: { id: string; title: string; intro?: ReactNode; children: ReactNode }) {
  // Grid tracks are minmax(0, 1fr), so a wide table scrolls inside its panel instead of widening the page.
  return (
    <Band aria-labelledby={id} inner="grid grid-cols-[minmax(0,1fr)] gap-6 py-8 sm:py-10">
      <div className="grid gap-2">
        <h2 id={id}>{title}</h2>
        {intro && <p className="max-w-prose text-sm text-muted-foreground">{intro}</p>}
      </div>
      {children}
    </Band>
  );
}

const GRID = "grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[repeat(2,minmax(0,1fr))]";

export default async function StatsPage() {
  if (!isStatsAuthorized((await headers()).get("authorization"))) notFound();
  const s = await readStats();
  const { visitors: v, subs, usage, pipeline: p, discovery: d } = s;

  const warnings: string[] = [];
  if (p.overdue) warnings.push(`The ${WEEKDAY.format(new Date(p.overdue))} run has not finished: the last refresh was ${Number.isFinite(p.ageHours) ? `${Math.round(p.ageHours)} hours ago` : "at an unknown time"}.`);
  if (p.failed) warnings.push("The last refresh workflow run failed.");
  const sentFails = p.digests.reduce((k, d) => k + d.failed, 0);
  if (sentFails) warnings.push(`${n(sentFails)} digest ${sentFails === 1 ? "email" : "emails"} failed to send in the last 14 days.`);

  return (
    <>
      <Band aria-labelledby="stats-heading" inner="grid gap-6 py-10 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-2">
            <h1 id="stats-heading">Stats</h1>
            <p className="text-sm text-muted-foreground">
              Private. Updated on every visit; days in Tallinn time.{s.env === "dev" && " Showing local test numbers, not the live site's."}
            </p>
          </div>
          <LogoutButton />
        </div>
        {warnings.length > 0 ? (
          <div role="alert" className="grid gap-1 border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <IconText as="p" className="font-semibold text-destructive" icon={<AlertTriangle className="size-4" strokeWidth={2} />}>
              Needs a look
            </IconText>
            <ul className="grid gap-1 pl-6">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        ) : (
          <IconText as="p" className="text-sm text-brand-sm" icon={<CheckCircle2 className="size-4" strokeWidth={1.75} />}>
            Pipeline healthy: last refresh {when(p.lastRun)}.
          </IconText>
        )}
      </Band>

      <Section
        id="visitors"
        title="Visitors"
        intro="Counted without cookies or IP addresses. A visitor is a browser, once per day; the same page again within 30 minutes is one view."
      >
        <Readout
          items={[
            { value: n(v.today.visitors), label: "Visitors today", hint: `${n(v.today.views)} page views` },
            { value: n(v.week.visitors), label: "Last 7 days", hint: `${n(v.week.views)} page views` },
            { value: n(v.month.visitors), label: "Last 30 days", hint: `${n(v.month.views)} page views` },
          ]}
        />
        <Panel title="Every day, last 30 days">
          <DailyChart data={v.daily} caption="Visitors and page views per day, last 30 days" />
        </Panel>
        <div className={GRID}>
          <Panel title="Top pages" description="Page views, last 30 days.">
            <Rank rows={v.pages} caption="Page views per page" />
          </Panel>
          <Panel title="Top referrers" description="Where visits came from, last 30 days.">
            <Rank rows={v.referrers.slice(0, 10)} caption="Visits per referrer" />
          </Panel>
          <Panel title="Countries" description="Page views, last 30 days.">
            <Rank rows={v.countries.slice(0, 10)} caption="Page views per country" />
          </Panel>
          <Panel title="Phone or desktop" description="Page views, last 30 days.">
            <Rank rows={v.devices.filter((d) => d.n > 0)} caption="Page views per device" />
          </Panel>
        </div>
      </Section>

      <Section id="subscribers" title="Subscribers">
        <Readout
          items={[
            { value: n(subs.confirmed), label: "Confirmed", good: subs.confirmed > 0 },
            { value: n(subs.waiting), label: "Waiting to confirm" },
            { value: n(subs.twice), label: "Twice a week" },
            { value: n(subs.weekly), label: "Weekly" },
          ]}
        />
        <Panel className="min-w-0" bodyClassName="min-w-0" title="Per week" description="Sign-ups, confirmations and unsubscribes, weeks starting Monday. Unsubscribes are counted even though the record itself is deleted.">
          <div className="-mx-4 overflow-x-auto md:mx-0">
            <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-hairline-strong">
                  {["Week of", "Sign-ups", "Confirmed", "Unsubscribed"].map((h) => (
                    <th key={h} scope="col" className="label-mono px-4 py-2.5 font-normal text-muted-foreground md:first:pl-0">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {[...subs.weeks].reverse().map((w) => (
                  <tr key={w.week} className="border-b border-hairline last:border-b-0">
                    <td className="px-4 py-2.5 md:pl-0">{WEEK.format(new Date(`${w.week}T12:00:00Z`))}</td>
                    <td className="px-4 py-2.5">{w.signups}</td>
                    <td className="px-4 py-2.5">{w.confirms}</td>
                    <td className="px-4 py-2.5">{w.unsubs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <div className={GRID}>
          <Panel title="Directions chosen" description={`Across all ${n(subs.total)} subscribers, confirmed or not.`}>
            <Rank rows={subs.directions} caption="Subscribers per direction" />
          </Panel>
          <Panel title="Levels and location" description={`${n(subs.estonia)} of ${n(subs.total)} want only roles open to Estonia.`}>
            <Rank rows={subs.levels} caption="Subscribers per level" />
          </Panel>
        </div>
        <Panel className="min-w-0" bodyClassName="min-w-0" title="Everyone" count={n(subs.total)}>
          <SubscriberTable
            rows={subs.list.map((r) => ({
              id: r.id,
              email: r.email,
              prefs: describePrefs({ ...EMPTY_PREFS, ...r.preferences }, r.frequency).replace(/^(Twice a week|Weekly), /, "").replace(/\.$/, ""),
              frequency: FREQUENCY_LABEL[toFrequency(r.frequency)],
              status: r.confirmed ? "Confirmed" : "Waiting",
              signedUp: TALLINN_DAY.format(new Date(r.created_at)),
              lastSent: r.confirmed && r.last_sent_at ? TALLINN_DAY.format(new Date(r.last_sent_at)) : "None yet",
            }))}
          />
        </Panel>
      </Section>

      <Section id="usage" title="What people use" intro="Anonymous events, last 30 days. No personal data: a click or a choice, counted per day.">
        <div className={GRID}>
          <Panel title="Most opened postings" count={n(usage.jobClicks)}>
            <RankList rows={usage.jobs} />
          </Panel>
          <Panel title="Clicks per direction">
            <Rank rows={usage.directions} caption="Job posting clicks per direction" />
          </Panel>
          <Panel title="Filters used">
            <Rank rows={usage.filters} caption="Times each filter was chosen" />
          </Panel>
          <Panel title="Searches">
            <RankList rows={usage.searches} />
          </Panel>
          <Panel title="Companies opened" description="Jobs opened from a company on Discover.">
            <RankList rows={usage.companies} />
          </Panel>
          <Panel title="Get new jobs" description="From opening the modal to a confirmed address.">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              {[
                ["Opened", usage.funnel.opened],
                ["Sent", usage.funnel.sent],
                ["New sign-ups", usage.funnel.signups],
                ["Confirmed", usage.funnel.confirmed],
              ].map(([label, value]) => (
                <div key={label as string} className="grid gap-1">
                  <dt className="label-mono text-muted-foreground">{label}</dt>
                  <dd className="font-heading text-3xl leading-none tabular-nums">{n(value as number)}</dd>
                </div>
              ))}
            </dl>
            {usage.funnel.opened > 0 && (
              <p className="mt-4 text-sm text-muted-foreground">
                {Math.round((usage.funnel.sent / usage.funnel.opened) * 100)}% of opens end in a sign-up sent.
              </p>
            )}
          </Panel>
          <Panel title="Snake">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div className="grid gap-1">
                <dt className="label-mono text-muted-foreground">Games, 30 days</dt>
                <dd className="font-heading text-3xl leading-none tabular-nums">{n(usage.snake.games)}</dd>
              </div>
              <div className="grid gap-1">
                <dt className="label-mono text-muted-foreground">Best score</dt>
                <dd className="font-heading text-3xl leading-none tabular-nums">{n(usage.snake.best)}</dd>
              </div>
            </dl>
          </Panel>
        </div>
      </Section>

      <Section id="pipeline" title="Pipeline" intro="The refresh, Monday and Thursday (GitHub Actions at 03:47 UTC, backups at 04:41 UTC and a Vercel cron at 05:20 UTC), and the digest step after it.">
        <div className={GRID}>
          <Panel title="Last run">
            <dl className="grid gap-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)]">
              <Fact label="Finished">{when(p.lastRun)}</Fact>
              <Fact label="Workflow">
                {p.workflowKnown && p.lastFinished ? (
                  <a href={p.lastFinished.url} target="_blank" rel="noopener noreferrer" className={p.failed ? "font-medium text-destructive underline" : "text-brand-sm underline"}>
                    {p.lastFinished.conclusion === "success" ? "Succeeded" : p.lastFinished.conclusion === "failure" ? "Failed" : (p.lastFinished.conclusion ?? "Unknown")},{" "}
                    {when(p.lastFinished.createdAt)}
                  </a>
                ) : (
                  "GitHub did not answer"
                )}
                {p.workflow && p.workflow.status !== "completed" && <span className="text-muted-foreground"> (a run is in progress)</span>}
              </Fact>
              <Fact label="Postings">
                {p.fetched ? `${n(p.fetched.unique)} unique of ${n(p.fetched.inScope)} in scope, from ${n(p.fetched.sources)} sources` : "Unknown"}
              </Fact>
              <Fact label="New postings">{p.newPostings === null ? "Unknown" : n(p.newPostings)}</Fact>
              <Fact label="Failed sources">{p.failedSources.length ? p.failedSources.join(", ") : "None"}</Fact>
              <Fact label="Model cost">
                ${p.costUsd.toFixed(4)} ({n(p.classified)} {p.classified === 1 ? "posting" : "postings"} classified)
              </Fact>
              <Fact label="Next run">{when(p.nextRun)}</Fact>
            </dl>
          </Panel>
          <Panel title="Weekly discovery" description="Mondays at 03:00 UTC: Claude Haiku with web search looks for companies in Estonia that hire designers. Readable job boards are added as readable, the rest as careers link only; both show on Discover.">
            <dl className="grid gap-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)]">
              <Fact label="Last run">{d.latest ? when(d.latest.at) : "Not run yet"}</Fact>
              <Fact label="Added this week">
                {d.addedThisWeek.length ? d.addedThisWeek.map((c) => `${c.name}${c.careersLinkOnly ? " (careers link only)" : ""}`).join(", ") : "None"}
              </Fact>
              <Fact label="Cost">
                {d.latest ? `$${d.latest.costUsd.toFixed(4)} last run (${n(d.latest.searches)} ${d.latest.searches === 1 ? "search" : "searches"}), $${d.costAll.toFixed(2)} in all` : "Nothing yet"}
              </Fact>
              <Fact label="Companies">
                {n(d.tracked)} on the list, {n(d.inEstonia)} on Discover (in Estonia), {n(d.linkOnly)} careers link only, {n(d.basedInEstonia)} based in Estonia, {n(d.byDiscovery)} found by discovery
              </Fact>
            </dl>
            {d.latest && d.latest.skipped.length > 0 && (
              <div className="mt-5 grid gap-2">
                <p className="label-mono text-muted-foreground">Skipped last run</p>
                <ul className="grid gap-1.5 text-sm">
                  {d.latest.skipped.map((s) => (
                    <li key={s.name} className="min-w-0">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-muted-foreground">: {s.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>
          <Panel
            className="min-w-0"
            bodyClassName="min-w-0"
            title="Runs, last 14 days"
            description="Run days (Monday and Thursday) and any other day with a run, and which trigger started it. Late: started by a backup, or over 30 minutes after the 03:47 UTC schedule. Missed: no run three hours after it."
          >
            <div className="-mx-4 overflow-x-auto md:mx-0">
              <table className="w-full min-w-[26rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-hairline-strong">
                    {["Day", "Started by", "Started", "Result"].map((h) => (
                      <th key={h} scope="col" className="label-mono px-4 py-2.5 font-normal text-muted-foreground md:first:pl-0">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...p.runs].reverse().map((r) => (
                    <tr key={r.day} className="border-b border-hairline last:border-b-0">
                      <td className="px-4 py-2.5 font-mono tabular-nums md:pl-0">{WEEK.format(new Date(`${r.day}T12:00:00Z`))}</td>
                      <td className="px-4 py-2.5">{r.trigger ?? "None"}</td>
                      <td className="px-4 py-2.5 font-mono tabular-nums">{r.started ? when(r.started) : ""}</td>
                      <td className={r.status === "missed" ? "px-4 py-2.5 font-medium text-destructive" : r.status === "late" ? "px-4 py-2.5 font-medium" : "px-4 py-2.5 text-muted-foreground"}>
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel title="Digests, last 14 days">
            {p.digests.some((d) => d.sent || d.failed) ? (
              <Rank
                rows={p.digests.filter((d) => d.sent || d.failed).map((d) => ({ label: `${WEEK.format(new Date(`${d.day}T12:00:00Z`))}${d.failed ? ` (${d.failed} failed)` : ""}`, n: d.sent }))}
                caption="Digest emails sent per day"
              />
            ) : (
              <Empty>No digests sent in the last 14 days.</Empty>
            )}
          </Panel>
        </div>
      </Section>
    </>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="label-mono pt-0.5 text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  );
}
