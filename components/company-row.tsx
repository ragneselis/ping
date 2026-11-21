import { ArrowRight, ArrowUpRight } from "lucide-react";
import { CategoryDot } from "@/components/category";
import { ROW_BLEED } from "@/components/job-row";
import { SignalTag } from "@/components/signal";
import { CompanyJobsLink } from "@/components/company-link";
import { CATEGORY_META } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { CompanyRow as Row } from "@/lib/view";

/** Columns from lg: company, directions, roles, links. Shared by the header row. */
export const COMPANY_GRID = "lg:grid-cols-[minmax(0,1fr)_10rem_7rem_15rem] lg:gap-x-6";

/**
 * One company on Discover. Name and the Estonia signal; its directions as category dots; the number of
 * current design roles; a link to those jobs on Jobs (?company=, plus the page's own filters) and to the
 * company's careers page. With no open roles the row says so quietly and stays, so students know whom
 * to watch. Everything sits on the text baseline; dots and icons are centred on the capitals.
 */
export function CompanyRow({ row, jobsQuery }: { row: Row; jobsQuery: string }) {
  const jobsHref = `/?company=${row.key}${jobsQuery ? `&${jobsQuery}` : ""}`;
  const names = row.directions.map((d) => CATEGORY_META[d.category].short);
  const signal = row.basedInEstonia ? (
    <SignalTag kind="estonia" label="Based in Estonia" />
  ) : row.openToEstonia > 0 ? (
    <SignalTag kind="estonia" label={`${row.openToEstonia} open to Estonia`} />
  ) : null;
  return (
    <li className={cn("border-b border-border py-4", ROW_BLEED)}>
      <div className={cn("grid gap-1.5 lg:items-baseline", COMPANY_GRID)}>
        <div className="baseline-row min-w-0 flex-wrap gap-x-4 gap-y-1">
          <h3 className="leading-snug font-semibold">{row.name}</h3>
          {signal && <span className="text-sm">{signal}</span>}
        </div>

        <div className="baseline-row min-w-0 flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground lg:contents">
          {row.roles > 0 ? (
            <>
              <span className="baseline-row gap-1.5" title={names.join(", ")}>
                {/* A zero-width text anchor gives this dots-only group a text baseline, so the dots line up with "N roles". */}
                <span aria-hidden>{"\u200b"}</span>
                {row.directions.map((d) => (
                  <span key={d.category} aria-hidden className="cap-icon flex shrink-0 [--icon-size:8px]">
                    <CategoryDot category={d.category} />
                  </span>
                ))}
                <span className="sr-only">Directions: {names.join(", ")}</span>
              </span>
              <span>
                <span className="font-mono text-foreground tabular-nums">{row.roles}</span> {row.roles === 1 ? "role" : "roles"}
              </span>
            </>
          ) : (
            <span className="lg:col-span-2">Quiet right now. Worth watching.</span>
          )}
        </div>

        <div className="baseline-row flex-wrap gap-x-5 gap-y-1 text-sm lg:justify-end">
          {row.roles > 0 && (
            <CompanyJobsLink
              href={jobsHref}
              companyKey={row.key}
              className="baseline-row gap-1 font-medium text-brand-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              See {row.roles === 1 ? "the job" : `${row.roles} jobs`}
              <span className="sr-only"> at {row.name}</span>
              <ArrowRight aria-hidden className="cap-icon size-3.5 shrink-0 [--icon-size:14px]" strokeWidth={1.75} />
            </CompanyJobsLink>
          )}
          {row.careersUrl && (
            <a
              href={row.careersUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="baseline-row gap-1 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              Careers page
              <span className="sr-only"> of {row.name} (opens their site)</span>
              <ArrowUpRight aria-hidden className="cap-icon size-3.5 shrink-0 [--icon-size:14px]" strokeWidth={1.75} />
            </a>
          )}
        </div>
      </div>
    </li>
  );
}
