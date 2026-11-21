import { ArrowRight, ArrowUpRight } from "lucide-react";
import { CategoryDot } from "@/components/category";
import { CompanyJobsLink } from "@/components/company-link";
import { IconText } from "@/components/icon-text";
import { ROW_BLEED } from "@/components/job-row";
import { SignalTag } from "@/components/signal";
import { CATEGORY_META } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { CompanyRow as Row } from "@/lib/view";

/** Columns from lg: company, directions and roles, links. Shared by the header row. */
export const COMPANY_GRID = "lg:grid-cols-[minmax(0,1fr)_14rem_15rem] lg:gap-x-6";

/**
 * One company on Discover. Name and the Estonia signal; its directions as category dots beside the number
 * of current design roles; a link to those jobs on Jobs (?company=, plus the page's own filters) and to the
 * company's careers page. With no open roles the row says so quietly and stays, so students know whom to
 * watch. Text sits on the baseline; dots and arrows are centred on the capitals by IconText.
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

        {row.roles > 0 ? (
          <IconText
            className="text-sm text-muted-foreground"
            icon={
              <span className="flex gap-1.5" title={names.join(", ")}>
                {row.directions.map((d) => (
                  <CategoryDot key={d.category} category={d.category} />
                ))}
              </span>
            }
          >
            <span className="sr-only">{names.join(", ")}: </span>
            <span className="font-mono text-foreground tabular-nums">{row.roles}</span> {row.roles === 1 ? "role" : "roles"}
          </IconText>
        ) : (
          <span className="text-sm text-muted-foreground">Quiet right now. Worth watching.</span>
        )}

        <div className="baseline-row flex-wrap gap-x-5 gap-y-1 text-sm lg:justify-end">
          {row.roles > 0 && (
            <IconText
              as={CompanyJobsLink}
              href={jobsHref}
              companyKey={row.key}
              className="gap-1 font-medium text-brand-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              iconEnd={<ArrowRight className="size-3.5" strokeWidth={1.75} />}
            >
              See {row.roles === 1 ? "the job" : `${row.roles} jobs`}
              <span className="sr-only"> at {row.name}</span>
            </IconText>
          )}
          {row.careersUrl && (
            <IconText
              as="a"
              href={row.careersUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="gap-1 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              iconEnd={<ArrowUpRight className="size-3.5" strokeWidth={1.75} />}
            >
              Careers page
              <span className="sr-only"> of {row.name} (opens their site)</span>
            </IconText>
          )}
        </div>
      </div>
    </li>
  );
}
