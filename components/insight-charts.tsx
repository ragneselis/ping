"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type Count = { label: string; count: number };
type ChartColor = 1 | 2 | 3 | 4 | 5;

/** Below this width labels go above the bars, so they never have to wrap or clip. */
const SIDE_LABELS_MIN_WIDTH = 480;
const LABEL_FONT_PX = 12;
const ROW_SIDE = 32;
const ROW_STACKED = 46;

/** Width of each string in the element's own font, measured with a canvas. */
function useTextWidths(el: HTMLElement | null, texts: string[], mono = false): number[] {
  const [widths, setWidths] = useState<number[]>(() => texts.map((t) => t.length * 7));
  const key = texts.join("|");
  useLayoutEffect(() => {
    if (!el) return;
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return;
    const family = getComputedStyle(el).getPropertyValue(mono ? "--font-mono" : "--font-sans") || getComputedStyle(el).fontFamily;
    ctx.font = `500 ${LABEL_FONT_PX}px ${family}`;
    setWidths(texts.map((t) => Math.ceil(ctx.measureText(t).width)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el, key, mono]);
  return widths;
}

function useWidth(): [(el: HTMLDivElement | null) => void, number, HTMLDivElement | null] {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, width, el];
}

export interface HBarSeries {
  key: string;
  label: string;
  color: ChartColor;
}

/**
 * Horizontal bar chart that uses the full card width. The longest bar reaches the right edge
 * (minus room for its value), labels are left-aligned beside the bars on wide cards and above
 * them on narrow ones, and the value sits at the end of each bar in the mono font.
 */
export function HBarChart({
  rows,
  series,
  legend = false,
  tooltipValue,
}: {
  rows: { label: string; values: number[]; end: string; note?: string }[];
  series: HBarSeries[];
  legend?: boolean;
  tooltipValue?: (value: number, seriesKey: string, row: { label: string; note?: string }) => string;
}) {
  const [ref, width, el] = useWidth();
  const labelWidths = useTextWidths(el, rows.map((r) => r.label));
  const endWidths = useTextWidths(el, rows.map((r) => r.end), true);
  const side = width >= SIDE_LABELS_MIN_WIDTH;
  const labelCol = Math.min(Math.max(...labelWidths, 40) + 16, Math.round(width * 0.42));
  const endCol = Math.max(...endWidths, 16) + 10;

  const data = rows.map((r) => ({ label: r.label, end: r.end, note: r.note, ...Object.fromEntries(series.map((s, i) => [s.key, r.values[i] ?? 0])) }));
  const max = Math.max(1, ...rows.map((r) => r.values.reduce((a, b) => a + b, 0)));
  const config = Object.fromEntries(series.map((s) => [s.key, { label: s.label, color: `var(--chart-${s.color})` }])) satisfies ChartConfig;
  const height = rows.length * (side ? ROW_SIDE : ROW_STACKED) + (legend ? 36 : 0) + 4;
  const last = series.at(-1)!.key;

  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 0, right: endCol, top: side ? 0 : 16, bottom: 0 }}
            barCategoryGap={side ? 6 : 14}
            accessibilityLayer
          >
            <XAxis type="number" hide domain={[0, max]} />
            <YAxis
              type="category"
              dataKey="label"
              hide={!side}
              width={side ? labelCol : 0}
              tickLine={false}
              axisLine={false}
              interval={0}
              tick={({ y, payload }) => (
                <text x={0} y={y} dy="0.35em" textAnchor="start" fontSize={LABEL_FONT_PX} className="fill-foreground font-medium">
                  {payload.value}
                </text>
              )}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideIndicator={series.length === 1}
                  formatter={
                    tooltipValue
                      ? (value, name, item) => (
                          <span className="flex w-full justify-between gap-4">
                            {series.length > 1 && <span className="text-muted-foreground">{config[String(name)]?.label}</span>}
                            <span className="font-mono">{tooltipValue(Number(value), String(name), item.payload)}</span>
                          </span>
                        )
                      : undefined
                  }
                />
              }
            />
            {legend && <ChartLegend verticalAlign="top" content={<ChartLegendContent />} />}
            {series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                stackId="stack"
                fill={`var(--color-${s.key})`}
                radius={series.length === 1 ? 4 : i === 0 ? [4, 0, 0, 4] : i === series.length - 1 ? [0, 4, 4, 0] : 0}
              >
                {s.key === last && (
                  <LabelList dataKey="end" position="right" offset={8} className="fill-foreground font-mono" fontSize={LABEL_FONT_PX} />
                )}
                {!side && i === 0 && (
                  <LabelList
                    dataKey="label"
                    content={({ x, y, value }) => (
                      <text x={Number(x)} y={Number(y) - 6} textAnchor="start" fontSize={LABEL_FONT_PX} className="fill-foreground font-medium">
                        {String(value)}
                      </text>
                    )}
                  />
                )}
              </Bar>
            ))}
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
}

/** Ranking of skills or tools: share of postings that ask for each one. */
export function RankingChart({ data, color }: { data: { label: string; count: number; share: number }[]; color: 1 | 2 }) {
  return (
    <HBarChart
      rows={data.map((d) => ({ label: d.label, values: [d.share], end: `${d.share}%`, note: `${d.count}` }))}
      series={[{ key: "share", label: "Share of postings", color }]}
      tooltipValue={(v, _k, row) => `${v}% (${row.note} postings)`}
    />
  );
}

/** Jobs per direction, split into "within reach" and the rest. */
export function CategoryHiringChart({ data }: { data: { label: string; reach: number; rest: number }[] }) {
  return (
    <HBarChart
      rows={data.map((d) => ({ label: d.label, values: [d.reach, d.rest], end: String(d.reach + d.rest) }))}
      series={[
        { key: "reach", label: "Within reach for graduates", color: 4 },
        { key: "rest", label: "Senior and above", color: 2 },
      ]}
      legend
      tooltipValue={(v) => String(v)}
    />
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
