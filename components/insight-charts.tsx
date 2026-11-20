"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type Count = { label: string; count: number };
/** A chart token number (--chart-n) or any CSS colour, e.g. a category colour from lib/categories. */
type ChartColor = 1 | 2 | 3 | 4 | 5 | string;
const colorValue = (c: ChartColor) => (typeof c === "number" ? `var(--chart-${c})` : c);

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
  caption,
}: {
  /** `colors` overrides the series colours for one row (one entry per series); `href` makes the row clickable. */
  rows: { label: string; values: number[]; end: string; note?: string; colors?: string[]; href?: string }[];
  series: HBarSeries[];
  legend?: boolean;
  tooltipValue?: (value: number, seriesKey: string, row: { label: string; note?: string }) => string;
  /** Caption for the screen-reader data table. */
  caption: string;
}) {
  const router = useRouter();
  const [ref, width, el] = useWidth();
  const labelWidths = useTextWidths(el, rows.map((r) => r.label));
  const endWidths = useTextWidths(el, rows.map((r) => r.end), true);
  const side = width >= SIDE_LABELS_MIN_WIDTH;
  const labelCol = Math.min(Math.max(...labelWidths, 40) + 16, Math.round(width * 0.42));
  const endCol = Math.max(...endWidths, 16) + 10;

  const data = rows.map((r) => ({ label: r.label, end: r.end, note: r.note, ...Object.fromEntries(series.map((s, i) => [s.key, r.values[i] ?? 0])) }));
  const max = Math.max(1, ...rows.map((r) => r.values.reduce((a, b) => a + b, 0)));
  const config = Object.fromEntries(series.map((s) => [s.key, { label: s.label, color: colorValue(s.color) }])) satisfies ChartConfig;
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
                  hideIndicator={series.length === 1 || rows.some((r) => r.colors)}
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
                className={rows.some((r) => r.href) ? "cursor-pointer" : undefined}
                onClick={(_d, idx) => {
                  const href = rows[idx]?.href;
                  if (href) router.push(href, { scroll: false });
                }}
                fill={`var(--color-${s.key})`}
                radius={series.length === 1 ? 4 : i === 0 ? [4, 0, 0, 4] : i === series.length - 1 ? [0, 4, 4, 0] : 0}
              >
                {rows.some((r) => r.colors) && rows.map((r) => <Cell key={r.label} fill={r.colors?.[i] ?? `var(--color-${s.key})`} />)}
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
      <DataTable caption={caption} head={["", ...series.map((s) => s.label)]} rows={rows.map((r) => [r.label, ...r.values.map(String)])} />
    </div>
  );
}

/** Text alternative for a chart: a visually hidden table screen readers can browse. */
function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: string[][] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {head.map((h, i) => (
            <th key={i} scope="col">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r[0]}>
            <th scope="row">{r[0]}</th>
            {r.slice(1).map((c, i) => (
              <td key={i}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Ranking of skills or tools: share of postings that ask for each one. */
export function RankingChart({ data, color, caption }: { data: { label: string; count: number; share: number }[]; color: ChartColor; caption: string }) {
  return (
    <HBarChart
      caption={caption}
      rows={data.map((d) => ({ label: d.label, values: [d.share], end: `${d.share}%`, note: `${d.count}` }))}
      series={[{ key: "share", label: "Share of postings", color }]}
      tooltipValue={(v, _k, row) => `${v}% (${row.note} postings)`}
    />
  );
}

/** Jobs per direction in each direction's own colour: solid = within reach, faded = the rest. Rows link to the direction. */
export function CategoryHiringChart({ data }: { data: { label: string; reach: number; rest: number; color: string; href: string }[] }) {
  return (
    <div className="grid gap-3">
      {/* Two-tone sample swatch: the legend shows the same solid-plus-faded split as the bars. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span aria-hidden className="flex h-2.5 w-10 overflow-hidden rounded-sm">
          <span className="w-1/2 bg-foreground" />
          <span className="w-1/2 bg-foreground/30" />
        </span>
        <span>
          <span className="font-medium text-foreground">Solid</span> = within reach, <span className="font-medium text-foreground">faded</span> = mid-level
          and above. Click a row to open that direction.
        </span>
      </div>
      <HBarChart
        caption="Jobs per direction: within reach and the rest"
        rows={data.map((d) => ({
          label: d.label,
          values: [d.reach, d.rest],
          end: String(d.reach + d.rest),
          colors: [d.color, `color-mix(in oklab, ${d.color} 30%, transparent)`],
          href: d.href,
        }))}
        series={[
          { key: "reach", label: "Within reach", color: "var(--data)" },
          { key: "rest", label: "Mid-level and above", color: "var(--data)" },
        ]}
        tooltipValue={(v) => String(v)}
      />
    </div>
  );
}

/** Axis tick that breaks multi-word labels ("Not stated") onto two lines instead of clipping them. */
function WrapTick({ x, y, payload }: { x?: number | string; y?: number | string; payload?: { value: string } }) {
  const words = String(payload?.value ?? "").split(" ");
  return (
    <text x={Number(x)} y={Number(y) + 4} textAnchor="middle" fontSize={11} className="fill-muted-foreground font-mono">
      {words.map((w, i) => (
        <tspan key={i} x={Number(x)} dy={i === 0 ? "0.71em" : "1.1em"}>
          {w}
        </tspan>
      ))}
    </text>
  );
}

/** Vertical distribution, e.g. seniority or years of experience. */
export function DistributionChart({ data, color, label, caption }: { data: Count[]; color: ChartColor; label: string; caption: string }) {
  const config = { count: { label, color: colorValue(color) } } satisfies ChartConfig;
  return (
    <div>
      <ChartContainer config={config} className="aspect-auto h-60 w-full">
        <BarChart data={data} margin={{ top: 20, left: 0, right: 0, bottom: 8 }} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} height={36} tick={<WrapTick />} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator />} />
          <Bar dataKey="count" fill="var(--color-count)" radius={4}>
            <LabelList dataKey="count" position="top" className="fill-foreground font-mono" fontSize={11} />
          </Bar>
        </BarChart>
      </ChartContainer>
      <DataTable caption={caption} head={["", label]} rows={data.map((d) => [d.label, String(d.count)])} />
    </div>
  );
}
