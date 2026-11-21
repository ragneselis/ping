import Link from "next/link";
import { PulseDot, SIGNAL_ICON } from "@/components/signal";
import { cn } from "@/lib/utils";

export interface ReadoutItem {
  value: string;
  label: string;
  /** Turns the item into a link, e.g. to the matching filter. */
  href?: string;
  /** A signal icon (Estonia, within reach) or Ping's pulse dot ("new today") before the label. */
  mark?: "estonia" | "reach" | "new";
  /** Dims the value when it rests on too little data to trust. */
  muted?: boolean;
}

/**
 * Readout strip: the live numbers set like a table row. Hairline rules above and below,
 * hairline dividers between cells, big mono figures. Items with an href are filters you can click.
 */
export function Readout({ items, note, className }: { items: ReadoutItem[]; note?: string; className?: string }) {
  const four = items.length === 4;
  return (
    <div className={cn("grid gap-3", className)}>
      {/* Cells that start a row sit flush with the text column; the others are padded off their divider. */}
      <dl className={cn("grid border-y border-border [&>:first-child]:pl-0", four && "max-lg:[&>:nth-child(3)]:pl-0", four ? "grid-cols-2 lg:grid-cols-4" : items.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
        {items.map((it, idx) => {
          const Icon = it.mark && it.mark !== "new" ? SIGNAL_ICON[it.mark] : null;
          const body = (
            <>
              <dt className="order-2 flex items-center gap-1.5 text-sm leading-snug text-muted-foreground">
                {it.mark === "new" && <PulseDot />}
                {Icon && <Icon aria-hidden className="size-3.5 shrink-0 text-foreground" strokeWidth={1.75} />}
                <span>{it.label}</span>
              </dt>
              <dd className={cn("order-1 font-mono text-2xl leading-none font-medium tracking-tight tabular-nums sm:text-4xl", it.muted && "text-muted-foreground")}>
                {it.value}
              </dd>
            </>
          );
          // Hairline dividers between cells. Four items fold to a 2 x 2 grid below lg.
          const divider = four
            ? cn(idx % 2 === 1 && "border-l", idx === 2 && "lg:border-l", idx >= 2 && "max-lg:border-t")
            : idx > 0 && "border-l";
          const cls = cn("flex flex-col gap-2 border-border px-3 py-4 sm:px-5 sm:py-5", divider);
          return it.href ? (
            <Link
              key={it.label}
              href={it.href}
              className={cn(cls, "transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none [&_dt_span]:underline-offset-4 hover:[&_dt_span]:underline")}
            >
              {body}
            </Link>
          ) : (
            <div key={it.label} className={cls}>
              {body}
            </div>
          );
        })}
      </dl>
      {note && <p className="max-w-prose text-sm text-muted-foreground">{note}</p>}
    </div>
  );
}
