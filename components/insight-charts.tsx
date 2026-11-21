"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { CATEGORY_META, categoryColor } from "@/lib/categories";
import { CATEGORIES, type Category } from "@/lib/types";

/** A chart token number (--chart-n) or any CSS colour, e.g. a category colour from lib/categories. */
type ChartColor = 1 | 2 | 3 | 4 | 5 | string;
const colorValue = (c: ChartColor) =>
  typeof c === "number" ? `var(--chart-${c})` : c;
type Breakdown = Record<Category, number>;

/** Below this width labels go above the bars, so they never have to wrap or clip. */
const SIDE_LABELS_MIN_WIDTH = 480;
const LABEL_FONT_PX = 12;
const ROW_SIDE = 32;
const ROW_STACKED = 46;
const BAR_STACKED = 14;
/** Key and size of the invisible segment at the end of each stack that carries the total label. */
const END_CAP = "__end";
const END_CAP_VALUE = 1e-6;
/** Hairline between stacked segments so neighbouring colours stay distinct. */
const SEGMENT_GAP = { stroke: "var(--card)", strokeWidth: 1 } as const;

/** Width of each string in the element's own font, measured with a canvas. */
function useTextWidths(
  el: HTMLElement | null,
  texts: string[],
  mono = false,
): number[] {
  const [widths, setWidths] = useState<number[]>(() =>
    texts.map((t) => t.length * 7),
  );
  const key = texts.join("|");
  useLayoutEffect(() => {
    if (!el) return;
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return;
    const family =
      getComputedStyle(el).getPropertyValue(
        mono ? "--font-mono" : "--font-sans",
      ) || getComputedStyle(el).fontFamily;
    ctx.font = `400 ${LABEL_FONT_PX}px ${family}`;
    setWidths(texts.map((t) => Math.ceil(ctx.measureText(t).width)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el, key, mono]);
  return widths;
}

function useWidth(): [
  (el: HTMLDivElement | null) => void,
  number,
  HTMLDivElement | null,
] {
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

interface HBarRow {
  label: string;
  values: number[];
  /** Text at the end of the bar (the total). */
  end: string;
  /** Per-series text for the tooltip and the data table; defaults to the raw values. */
  detail?: string[];
  /** Per-series colours for this row only. */
  colors?: string[];
  /** Makes the row clickable. */
  href?: string;
  /** A category dot drawn before the row label. */
  dot?: string;
  /** Postings per direction, in CATEGORY_SERIES order: shown in the tooltip and data table only, never drawn. */
  breakdown?: number[];
}

/** Tooltip listing every non-empty segment of the hovered bar, with its colour. */
function BreakdownTooltip({
  active,
  payload,
  rows,
  series,
  title,
}: {
  active?: boolean;
  payload?: { payload?: { idx?: number } }[];
  rows: HBarRow[];
  series: HBarSeries[];
  title?: (row: HBarRow) => string;
}) {
  const idx = payload?.[0]?.payload?.idx;
  if (!active || idx === undefined) return null;
  const row = rows[idx];
  // A row with a breakdown lists its directions (with their dots) instead of the drawn segments.
  const items = row.breakdown
    ? CATEGORY_SERIES.map((s, i) => ({ s, i, color: colorValue(s.color), text: String(row.breakdown![i]) })).filter(({ i }) => row.breakdown![i] > 0)
    : series
        .map((s, i) => ({ s, i, color: row.colors?.[i] ?? colorValue(s.color), text: row.detail?.[i] ?? String(row.values[i]) }))
        .filter(({ i }) => row.values[i] > 0);
  return (
    <div className="grid min-w-44 gap-1.5 border border-border bg-popover px-3 py-2.5 text-xs text-popover-foreground">
      <div className="font-medium">
        {title ? title(row) : `${row.label}: ${row.end}`}
      </div>
      {items.map(({ s, color, text }) => (
        <div key={s.key} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2 shrink-0 rounded-full" style={{ background: color }} />
            {s.label}
          </span>
          <span className="font-mono text-foreground">{text}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Horizontal bar chart that uses the full card width. The longest bar reaches the right edge
 * (minus room for its value), labels are left-aligned beside the bars on wide cards and above
 * them on narrow ones, and the total sits at the end of each bar in the mono font.
 * With several series the bars stack, separated by a hairline.
 */
export function HBarChart({
  rows,
  series,
  caption,
  tooltipTitle,
}: {
  rows: HBarRow[];
  series: HBarSeries[];
  caption: string;
  tooltipTitle?: (row: HBarRow) => string;
}) {
  const router = useRouter();
  const [ref, width, el] = useWidth();
  const labelWidths = useTextWidths(
    el,
    rows.map((r) => r.label),
    true,
  );
  const endWidths = useTextWidths(
    el,
    rows.map((r) => r.end),
    true,
  );
  const side = width >= SIDE_LABELS_MIN_WIDTH;
  // Room for the category dot (8px plus a 6px gap) when rows carry one.
  const dotSpace = rows.some((r) => r.dot) ? 14 : 0;
  const labelCol = Math.min(
    Math.max(...labelWidths, 40) + 16 + dotSpace,
    Math.round(width * 0.42),
  );
  const endCol = Math.max(...endWidths, 16) + 10;
  const stacked = series.length > 1;

  const data = rows.map((r, idx) => ({
    idx,
    label: r.label,
    end: r.end,
    [END_CAP]: END_CAP_VALUE,
    ...Object.fromEntries(series.map((s, i) => [s.key, r.values[i] ?? 0])),
  }));
  const max = Math.max(
    1,
    ...rows.map((r) => r.values.reduce((a, b) => a + b, 0)),
  );
  const config = Object.fromEntries(
    series.map((s) => [s.key, { label: s.label, color: colorValue(s.color) }]),
  ) satisfies ChartConfig;
  const height = rows.length * (side ? ROW_SIDE : ROW_STACKED) + 4;
  const clickable = rows.some((r) => r.href);

  return (
    // Reserve the height before the first measurement so the page does not jump when the chart appears.
    <div
      ref={ref}
      className="w-full"
      style={{ minHeight: width > 0 ? undefined : rows.length * ROW_SIDE + 4 }}
    >
      {width > 0 && (
        <ChartContainer
          config={config}
          className="aspect-auto w-full"
          style={{ height }}
        >
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 0, right: endCol, top: side ? 0 : 16, bottom: 0 }}
            barCategoryGap={side ? 6 : undefined}
            barSize={side ? undefined : BAR_STACKED}
            accessibilityLayer
          >
            <XAxis type="number" hide domain={[0, max]} />
            {/* Labels come from the row position, not from a bar, so a row whose first segment is empty keeps its name. */}
            <YAxis
              type="category"
              dataKey="label"
              width={side ? labelCol : 1}
              tickLine={false}
              axisLine={false}
              interval={0}
              tick={({ y, payload, index }) => {
                const ty = side ? Number(y) : Number(y) - BAR_STACKED / 2 - 6;
                const dot = rows[index]?.dot;
                return (
                  <g>
                    {dot && <circle cx={4} cy={side ? ty : ty - 4} r={4} fill={dot} />}
                    <text
                      x={dotSpace}
                      y={ty}
                      dy={side ? "0.35em" : 0}
                      textAnchor="start"
                      fontSize={LABEL_FONT_PX}
                      className="fill-foreground font-mono"
                    >
                      {payload.value}
                    </text>
                  </g>
                );
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <BreakdownTooltip
                  rows={rows}
                  series={series}
                  title={tooltipTitle}
                />
              }
            />
            {series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                stackId="stack"
                fill={`var(--color-${s.key})`}
                radius={0}
                isAnimationActive={false}
                {...(stacked ? SEGMENT_GAP : {})}
                className={clickable ? "cursor-pointer" : undefined}
                onClick={(_d, idx) => {
                  const href = rows[idx]?.href;
                  if (href) router.push(href, { scroll: false });
                }}
              >
                {rows.some((r) => r.colors) &&
                  rows.map((r) => (
                    <Cell
                      key={r.label}
                      fill={r.colors?.[i] ?? `var(--color-${s.key})`}
                    />
                  ))}
              </Bar>
            ))}
            {/* Invisible end cap that always exists, so the total shows even when the last segment is empty. */}
            <Bar
              dataKey={END_CAP}
              stackId="stack"
              fill="transparent"
              isAnimationActive={false}
            >
              <LabelList
                dataKey="end"
                position="right"
                offset={8}
                className="fill-foreground font-mono"
                fontSize={LABEL_FONT_PX}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
      <DataTable
        caption={caption}
        head={["", "Total", ...(rows.some((r) => r.breakdown) ? CATEGORY_SERIES.map((s) => s.label) : stacked ? series.map((s) => s.label) : [])]}
        rows={rows.map((r) => [
          r.label,
          r.end,
          ...(r.breakdown ? r.breakdown.map(String) : stacked ? series.map((_, i) => r.detail?.[i] ?? String(r.values[i])) : []),
        ])}
      />
    </div>
  );
}

/** Text alternative for a chart: a visually hidden table screen readers can browse. The wrapper clips it (tables ignore sr-only sizing). */
function DataTable({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: string[];
  rows: string[][];
}) {
  return (
    <div className="sr-only">
      <table>
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
    </div>
  );
}

/** The nine directions in their fixed order, with their colours: the breakdown in tooltips and data tables. */
const CATEGORY_SERIES: HBarSeries[] = CATEGORIES.map((c) => ({
  key: c,
  label: CATEGORY_META[c].short,
  color: categoryColor(c),
}));

/** "All directions" bars are one brand colour: emerald (--brand-lg, 3.77:1 on white; #34d399 in dark). */
const BRAND_BAR = "var(--brand-lg)";

type RankItem = {
  label: string;
  count: number;
  share: number;
  byCategory?: Breakdown;
};

/**
 * Ranking of skills or tools: share of postings that ask for each one. One bar colour: a single
 * direction's colour, or the brand emerald for "All directions" (`byDirection`), where hovering a
 * bar shows how its postings split across the directions.
 */
export function RankingChart({
  data,
  color,
  caption,
  byDirection = false,
}: {
  data: RankItem[];
  color?: ChartColor;
  caption: string;
  byDirection?: boolean;
}) {
  return (
    <HBarChart
      caption={caption}
      series={[{ key: "share", label: "Share of postings", color: color ?? BRAND_BAR }]}
      rows={data.map((d) => ({
        label: d.label,
        values: [d.share],
        end: `${d.share}%`,
        detail: [`${d.share}% (${d.count} postings)`],
        breakdown: byDirection ? CATEGORIES.map((c) => d.byCategory?.[c] ?? 0) : undefined,
      }))}
      tooltipTitle={byDirection ? (r) => `${r.label}: ${r.end} of postings, by direction` : undefined}
    />
  );
}

/** Jobs per direction in two greens: --brand-lg = within reach, --brand-pale = mid-level and above. Each row's category dot is the only category colour. Rows link to the direction. */
export function CategoryHiringChart({
  data,
}: {
  data: {
    label: string;
    reach: number;
    rest: number;
    color: string;
    href: string;
  }[];
}) {
  return (
    <div className="grid gap-3">
      {/* Legend names the series by meaning, each with its own swatch, so it holds in both themes. */}
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground" aria-label="Colour key">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 bg-brand-lg" />
          <span className="font-medium text-foreground">Within reach</span>
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 bg-brand-pale" />
          <span className="font-medium text-foreground">Mid-level and above</span>
        </li>
        <li>Click a row to open that direction.</li>
      </ul>
      <HBarChart
        caption="Jobs per direction: within reach and the rest"
        rows={data.map((d) => ({
          label: d.label,
          values: [d.reach, d.rest],
          end: String(d.reach + d.rest),
          dot: d.color,
          href: d.href,
        }))}
        series={[
          { key: "reach", label: "Within reach", color: "var(--brand-lg)" },
          {
            key: "rest",
            label: "Mid-level and above",
            color: "var(--brand-pale)",
          },
        ]}
      />
    </div>
  );
}

/** Axis tick that breaks multi-word labels ("Not stated") onto two lines instead of clipping them. */
function WrapTick({
  x,
  y,
  payload,
}: {
  x?: number | string;
  y?: number | string;
  payload?: { value: string };
}) {
  const words = String(payload?.value ?? "").split(" ");
  return (
    <text
      x={Number(x)}
      y={Number(y) + 4}
      textAnchor="middle"
      fontSize={11}
      className="fill-muted-foreground font-mono"
    >
      {words.map((w, i) => (
        <tspan key={i} x={Number(x)} dy={i === 0 ? "0.71em" : "1.1em"}>
          {w}
        </tspan>
      ))}
    </text>
  );
}

/**
 * Vertical distribution, e.g. seniority or years of experience. One column colour: a single
 * direction's, or the brand emerald with a per-direction breakdown in the tooltip (`byDirection`).
 * The total sits on top in the mono font.
 */
export function DistributionChart({
  data,
  color,
  label,
  caption,
  byDirection = false,
}: {
  data: { label: string; count: number; byCategory?: Breakdown }[];
  color?: ChartColor;
  label: string;
  caption: string;
  byDirection?: boolean;
}) {
  const series: HBarSeries[] = [{ key: "count", label, color: color ?? BRAND_BAR }];
  const rows: HBarRow[] = data.map((d) => ({
    label: d.label,
    values: [d.count],
    end: String(d.count),
    breakdown: byDirection ? CATEGORIES.map((c) => d.byCategory?.[c] ?? 0) : undefined,
  }));
  const chartData = rows.map((r, idx) => ({
    idx,
    label: r.label,
    end: r.end,
    [END_CAP]: END_CAP_VALUE,
    ...Object.fromEntries(series.map((s, i) => [s.key, r.values[i]])),
  }));
  const config = Object.fromEntries(
    series.map((s) => [s.key, { label: s.label, color: colorValue(s.color) }]),
  ) satisfies ChartConfig;
  return (
    <div>
      <ChartContainer config={config} className="aspect-auto h-60 w-full">
        <BarChart
          data={chartData}
          margin={{ top: 20, left: 0, right: 0, bottom: 8 }}
          accessibilityLayer
        >
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval={0}
            height={36}
            tick={<WrapTick />}
          />
          <ChartTooltip
            cursor={false}
            content={
              <BreakdownTooltip
                rows={rows}
                series={series}
                title={(r) => `${r.label}: ${r.end} postings`}
              />
            }
          />
          {series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              stackId="stack"
              fill={`var(--color-${s.key})`}
              radius={0}
              isAnimationActive={false}
            />
          ))}
          <Bar
            dataKey={END_CAP}
            stackId="stack"
            fill="transparent"
            isAnimationActive={false}
          >
            <LabelList
              dataKey="end"
              position="top"
              className="fill-foreground font-mono"
              fontSize={11}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
      <DataTable
        caption={caption}
        head={["", "Total", ...(byDirection ? CATEGORY_SERIES.map((s) => s.label) : [])]}
        rows={rows.map((r) => [r.label, r.end, ...(r.breakdown ? r.breakdown.map(String) : [])])}
      />
    </div>
  );
}
