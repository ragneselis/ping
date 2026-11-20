"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type Share = { label: string; count: number; share: number };
type Count = { label: string; count: number };

const clip = (s: string, n = 30) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Horizontal ranking: share of postings that ask for each item. */
export function RankingChart({ data, color, unit }: { data: Share[]; color: 1 | 2; unit: string }) {
  const config = { share: { label: `Share of ${unit}`, color: `var(--chart-${color})` } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height: Math.max(160, data.length * 34) }}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 40, top: 0, bottom: 0 }} accessibilityLayer>
        <XAxis type="number" dataKey="share" hide domain={[0, 100]} />
        <YAxis
          type="category"
          dataKey="label"
          width={150}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => clip(v)}
          className="font-mono"
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator formatter={(v, _n, item) => `${v}% (${item.payload.count} postings)`} />} />
        <Bar dataKey="share" fill="var(--color-share)" radius={4}>
          <LabelList dataKey="share" position="right" className="fill-foreground font-mono" fontSize={12} formatter={(v) => `${v}%`} />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

/** Vertical distribution, e.g. seniority or years of experience. */
export function DistributionChart({ data, color, label }: { data: Count[]; color: 3 | 4 | 5; label: string }) {
  const config = { count: { label, color: `var(--chart-${color})` } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <BarChart data={data} margin={{ top: 20, left: 0, right: 0, bottom: 0 }} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} className="font-mono" fontSize={11} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={4}>
          <LabelList dataKey="count" position="top" className="fill-foreground font-mono" fontSize={11} />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

/** Jobs per category, split into "within reach" and the rest. */
export function CategoryHiringChart({ data }: { data: { label: string; reach: number; rest: number }[] }) {
  const config = {
    reach: { label: "Within reach for graduates", color: "var(--chart-4)" },
    rest: { label: "Senior and above", color: "var(--chart-2)" },
  } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height: data.length * 38 + 40 }}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }} accessibilityLayer>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} className="font-mono" fontSize={11} />
        <YAxis type="category" dataKey="label" width={130} tickLine={false} axisLine={false} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="reach" stackId="a" fill="var(--color-reach)" radius={[4, 0, 0, 4]} />
        <Bar dataKey="rest" stackId="a" fill="var(--color-rest)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
