import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * Ping's one panel. Every card-like block on the site uses it: the chart panels and the
 * direction panels on Market insights, the "Start here" panel and the empty state on Jobs.
 *
 * Anatomy: a 1px hairline border on the card surface, square corners, a padded body, and four
 * slots in a fixed order: header (optional lead mark, title, optional count), description,
 * body, footer (above its own hairline). With `subgrid`, the slots become rows of the parent
 * grid, so panels side by side line up slot by slot.
 *
 * A panel with an `href` is one link. It has no fill on hover: its border turns the accent
 * (a direction's colour, or the brand emerald), the title underlines and an arrow appears.
 * Keyboard focus gets the same treatment plus the focus ring.
 */
export function Panel({
  title,
  titleAs: Title = "h3",
  lead,
  leadSize = 10,
  count,
  description,
  footer,
  children,
  href,
  accent,
  subgrid = false,
  className,
  bodyClassName,
  revealIndex = 0,
}: {
  title?: ReactNode;
  titleAs?: "h2" | "h3" | "p";
  /** A small mark before the title, e.g. a category dot. */
  lead?: ReactNode;
  /** The lead's rendered size in px, so it can sit on the title's capitals (size-2.5 = 10). */
  leadSize?: number;
  /** A figure set at the far end of the header. */
  count?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  /** Makes the whole panel one link. */
  href?: string;
  /** Hover and focus border colour for a linked panel. Defaults to the brand emerald. */
  accent?: string;
  /** Lay the four slots out as rows of the parent grid (the parent sets `grid-rows-subgrid` columns). */
  subgrid?: boolean;
  className?: string;
  bodyClassName?: string;
  /** Position in its group, for the scroll-reveal stagger. */
  revealIndex?: number;
}) {
  const linked = !!href;
  const header =
    title || count !== undefined ? (
      <div className="baseline-row justify-between gap-4">
        <Title
          className={cn(
            /* On the text baseline, so the count at the far end sits on the title's line; the dot
               and the arrow are centred on the capitals by `cap-icon` (the icon rule). */
            "baseline-row min-w-0 gap-2 font-heading text-title font-semibold tracking-tight",
            linked && "underline-offset-4 decoration-1 group-hover/panel:underline group-focus-visible/panel:underline",
          )}
        >
          {lead && (
            <span aria-hidden className="cap-icon flex shrink-0" style={{ "--icon-size": `${leadSize}px` } as CSSProperties}>
              {lead}
            </span>
          )}
          <span className="min-w-0">{title}</span>
          {linked && (
            <span aria-hidden className="cap-icon flex shrink-0" style={{ "--icon-size": "16px" } as CSSProperties}>
              <ArrowUpRight className="size-4 opacity-0 transition-opacity group-hover/panel:opacity-100 group-focus-visible/panel:opacity-100" />
            </span>
          )}
        </Title>
        {count !== undefined && <span className="shrink-0 font-mono text-2xl leading-none tabular-nums">{count}</span>}
      </div>
    ) : null;

  const slots = (
    <>
      {subgrid ? <div>{header}</div> : header}
      {description !== undefined && <div className="max-w-prose text-sm text-muted-foreground">{description}</div>}
      <div className={cn("min-w-0", bodyClassName)}>{children}</div>
      {footer !== undefined ? <div className={cn("border-t border-border pt-4", !subgrid && "mt-auto")}>{footer}</div> : subgrid ? <div /> : null}
    </>
  );

  const base = cn(
    "group/panel relative border border-border bg-card p-5 text-sm text-card-foreground sm:p-6",
    subgrid ? "row-span-4 grid grid-rows-subgrid gap-4" : "flex flex-col gap-4",
    linked &&
      "transition-[border-color] duration-(--dur-fast) ease-(--ease-out) hover:border-(--panel-accent) focus-visible:border-(--panel-accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    className,
  );

  // Every panel rises into view once (see components/reveal.tsx); a fast colour transition on hover.
  const reveal = { "data-reveal": "", style: { "--reveal-i": revealIndex } as CSSProperties };
  if (linked) {
    return (
      <Link
        href={href}
        className={base}
        data-panel=""
        data-reveal=""
        style={{ "--panel-accent": accent ?? "var(--brand-lg)", "--reveal-i": revealIndex } as CSSProperties}
      >
        {slots}
      </Link>
    );
  }
  return (
    <div className={base} data-panel="" {...reveal}>
      {slots}
    </div>
  );
}
