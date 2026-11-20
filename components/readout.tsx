import Link from "next/link";
import { cn } from "@/lib/utils";

export interface ReadoutItem {
  value: string;
  label: string;
  /** Turns the item into a link, e.g. to the matching filter. */
  href?: string;
  /** Marks a decision signal (Estonia, within reach) with the signal colour. */
  signal?: boolean;
  /** Dims the value when it rests on too little data to trust. */
  muted?: boolean;
}

/**
 * Mono readout strip: the live numbers in one hairline instrument panel instead of
 * a row of icon-and-number cards. Items with an href are filters you can click.
 */
export function Readout({ items, note, className }: { items: ReadoutItem[]; note?: string; className?: string }) {
  return (
    <div className={cn("grid gap-2", className)}>
      <dl
        className={cn(
          "cut-corner grid overflow-hidden rounded-lg border border-border bg-card [--cut-line:var(--border)]",
          items.length === 4 ? "grid-cols-2 sm:grid-cols-4" : items.length === 2 ? "grid-cols-2" : "grid-cols-3",
        )}
      >
        {items.map((it, idx) => {
          const body = (
            <>
              <dt className="order-2 text-xs leading-snug text-muted-foreground sm:text-sm">{it.label}</dt>
              <dd
                className={cn(
                  "order-1 font-mono text-xl leading-none font-semibold tabular-nums sm:text-3xl",
                  it.muted && "text-muted-foreground",
                  it.signal && "flex items-center gap-2 before:size-1.5 before:shrink-0 before:rounded-full before:bg-signal sm:before:size-2",
                )}
              >
                {it.value}
              </dd>
            </>
          );
          // Hairline dividers between items. Four items fold to a 2 x 2 grid on phones.
          const divider =
            items.length === 4
              ? cn(idx % 2 === 1 && "border-l", idx === 2 && "sm:border-l", idx >= 2 && "max-sm:border-t")
              : idx > 0 && "border-l";
          const cls = cn("flex flex-col gap-1.5 border-border px-3 py-3 sm:px-5 sm:py-4", divider);
          return it.href ? (
            <Link
              key={it.label}
              href={it.href}
              className={cn(cls, "transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none [&_dt]:underline-offset-4 hover:[&_dt]:underline")}
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
      {note && <p className="max-w-prose text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
