import { SIGNAL_ICON } from "@/components/signal";
import { CountUp } from "@/components/count-up";
import { DispersingRules } from "@/components/rules";
import { FreshTile } from "@/components/tiles";
import { IconText } from "@/components/icon-text";
import { FilterLink } from "@/components/filter-link";
import { cn } from "@/lib/utils";

export interface ReadoutItem {
  value: string;
  label: string;
  /** Turns the item into a link, e.g. to the matching filter. */
  href?: string;
  /** A signal icon (Estonia, within reach) or the fresh tile ("new today") before the label. */
  mark?: "estonia" | "reach" | "new";
  /** Dims the value when it rests on too little data to trust. */
  muted?: boolean;
  /** Good news (a within-reach or open-to-Estonia count, new today): set in emerald. Everything else is text colour. */
  good?: boolean;
  /** A short framing line under the label, e.g. "A wish list, not a wall." */
  hint?: string;
}

/**
 * Readout band in GrönLoop's metric-strip style: dashed hairlines above and below, dashed
 * vertical dividers between cells (none on the first, where the frame line already sits), big
 * emerald figures in the display face and small mono labels underneath. The band bleeds out to
 * the frame lines. Items with an href are filters you can click (FilterLink: they bring the results into view).
 */
export function Readout({
  items,
  note,
  rules = false,
  className,
}: {
  items: ReadoutItem[];
  note?: string;
  rules?: boolean;
  className?: string;
}) {
  const four = items.length === 4;
  return (
    <div className={cn("grid gap-4", className)}>
      <div>
        {/* A plain list: each cell reads as "value, label" and may be a link. (Links cannot sit directly in a <dl>.) */}
        <ul
          className={cn(
            "-mx-4 grid border-y border-dashed border-hairline md:-mx-6 lg:-mx-8",
            four
              ? "grid-cols-2 lg:grid-cols-4"
              : items.length === 2
                ? "grid-cols-2"
                : "grid-cols-3",
          )}
        >
          {items.map((it, idx) => {
            const Icon =
              it.mark && it.mark !== "new" ? SIGNAL_ICON[it.mark] : null;
            const body = (
              <>
                {it.mark ? (
                  <IconText
                    className="label-mono order-2 leading-snug text-muted-foreground"
                    icon={
                      it.mark === "new" ? (
                        <FreshTile />
                      ) : (
                        Icon && <Icon className="size-3.5 text-brand-sm" strokeWidth={1.75} />
                      )
                    }
                  >
                    <span data-label>{it.label}</span>
                  </IconText>
                ) : (
                  <span className="label-mono order-2 leading-snug text-muted-foreground">
                    <span data-label>{it.label}</span>
                  </span>
                )}
                <span
                  className={cn(
                    "order-1 font-heading text-4xl leading-none font-semibold tracking-tight tabular-nums sm:text-5xl",
                    it.muted
                      ? "text-muted-foreground"
                      : it.good
                        ? "text-brand-lg"
                        : "text-foreground",
                  )}
                >
                  <CountUp value={it.value} />
                </span>
                {it.hint && (
                  <span className="order-3 -mt-1 text-sm text-muted-foreground">
                    {it.hint}
                  </span>
                )}
              </>
            );
            // Dashed dividers are cell borders, so the band's rules never break. Four items fold to 2 x 2 below lg.
            const divider = four
              ? cn(
                  idx % 2 === 1 && "border-l",
                  idx === 2 && "lg:border-l",
                  idx >= 2 && "max-lg:border-t",
                )
              : idx > 0 && "border-l";
            const cls = "flex flex-col gap-3 px-4 py-6 md:px-6 sm:py-8 lg:px-8";
            return (
              <li
                key={it.label}
                className={cn("flex", divider, "border-dashed border-hairline")}
              >
                {it.href ? (
                  <FilterLink
                    href={it.href}
                    className={cn(
                      cls,
                      "flex-1 transition-colors hover:bg-brand-tint focus-visible:bg-brand-tint focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring [&_[data-label]]:underline-offset-4 hover:[&_[data-label]]:underline focus-visible:[&_[data-label]]:underline",
                    )}
                  >
                    {body}
                  </FilterLink>
                ) : (
                  <div className={cn(cls, "flex-1")}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
        {/* GrönLoop's dispersing lines: the first lands on the band's bottom rule, so the band reads as spreading out. */}
        {rules && <DispersingRules />}
      </div>
      {note && (
        <p className="max-w-prose text-sm text-muted-foreground">{note}</p>
      )}
    </div>
  );
}
