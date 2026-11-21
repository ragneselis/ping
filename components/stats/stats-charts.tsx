"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { HBarChart } from "@/components/insight-charts";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

/*
 * Charts for /stats, built on Market insights' chart components and tokens: square bars, mono
 * labels, the brand greens (--brand-lg, --brand-pale). Every chart keeps a text alternative.
 */

const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const dayLabel = (day: string) => DAY.format(new Date(`${day}T12:00:00Z`));

/** Visitors and page views per day, side by side. */
export function DailyChart({ data, caption }: { data: { day: string; visitors: number; views: number }[]; caption: string }) {
  const config = {
    views: { label: "Page views", color: "var(--brand-pale)" },
    visitors: { label: "Visitors", color: "var(--brand-lg)" },
  } satisfies ChartConfig;
  const rows = data.map((d) => ({ ...d, label: dayLabel(d.day) }));
  return (
    <div className="grid gap-3">
      <ChartContainer config={config} className="aspect-auto h-56 w-full sm:h-64">
        <BarChart data={rows} margin={{ left: 0, right: 0, top: 8, bottom: 0 }} barGap={1} barCategoryGap="18%" accessibilityLayer>
          <CartesianGrid vertical={false} strokeDasharray="2 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} className="font-mono" />
          <YAxis width={32} tickLine={false} axisLine={false} allowDecimals={false} className="font-mono" />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Bar dataKey="views" fill="var(--color-views)" radius={0} isAnimationActive={false} />
          <Bar dataKey="visitors" fill="var(--color-visitors)" radius={0} isAnimationActive={false} />
        </BarChart>
      </ChartContainer>
      <div className="flex gap-5 text-xs text-muted-foreground">
        <Legend color="var(--brand-lg)" label="Visitors" />
        <Legend color="var(--brand-pale)" label="Page views" />
      </div>
      <div className="sr-only">
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th>Day</th>
              <th>Visitors</th>
              <th>Page views</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.day}>
                <td>{r.label}</td>
                <td>{r.visitors}</td>
                <td>{r.views}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className="size-2.5" style={{ background: color }} />
      {label}
    </span>
  );
}

/** A ranking with short labels (pages, referrers, countries, directions, filters): Market insights' bar chart. */
export function Rank({ rows, caption, unit = "" }: { rows: { label: string; n: number }[]; caption: string; unit?: string }) {
  if (!rows.length) return <Empty />;
  return (
    <HBarChart
      caption={caption}
      series={[{ key: "n", label: caption, color: "var(--brand-lg)" }]}
      rows={rows.map((r) => ({ label: r.label, values: [r.n], end: r.n.toLocaleString("en-GB"), detail: [`${r.n.toLocaleString("en-GB")}${unit}`] }))}
    />
  );
}

/**
 * A ranking with long labels (job postings, searches): one row each, the label in full, a hairline
 * bar for scale and the count in mono. Rows can link out.
 */
export function RankList({ rows }: { rows: { label: string; n: number; url?: string }[] }) {
  if (!rows.length) return <Empty />;
  const max = Math.max(...rows.map((r) => r.n), 1);
  return (
    <ol className="grid">
      {rows.map((r, i) => (
        <li key={`${r.label}-${i}`} className="grid gap-1.5 border-b border-hairline py-2.5 last:border-b-0">
          <div className="flex items-baseline justify-between gap-4 text-sm">
            {r.url ? (
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="min-w-0 text-pretty underline-offset-4 hover:text-brand-sm hover:underline">
                {r.label}
              </a>
            ) : (
              <span className="min-w-0 text-pretty">{r.label}</span>
            )}
            <span className="shrink-0 font-mono tabular-nums">{r.n.toLocaleString("en-GB")}</span>
          </div>
          <span aria-hidden className="h-1 bg-brand-tint">
            <span className={cn("block h-full bg-brand-lg")} style={{ width: `${(r.n / max) * 100}%` }} />
          </span>
        </li>
      ))}
    </ol>
  );
}

export function Empty({ children = "Nothing recorded yet." }: { children?: string }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
