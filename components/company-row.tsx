import { ArrowRight, ArrowUpRight } from "lucide-react";
import { CategoryDot } from "@/components/category";
import { CompanyJobsLink } from "@/components/company-link";
import { IconText } from "@/components/icon-text";
import { ROW_BLEED } from "@/components/job-row";
import { CATEGORY_META } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { CompanyRow as Row } from "@/lib/view";

/** Columns from lg: company (name and what they do), design roles, links. Shared by the header row. */
export const COMPANY_GRID = "lg:grid-cols-[minmax(0,1fr)_19rem_15rem] lg:gap-x-6";

/**
 * One company on Discover: the name and one line on what they do; when Ping reads their jobs, the current
 * design roles with their directions as category dots (or a quiet line when there are none); when it
 * cannot, a note to check their page. Then a link to those jobs on Jobs (?company=, with the page's
 * direction) and to their careers page. Text on the baseline; dots and arrows on the capitals (IconText).
 */
export function CompanyRow({ row, jobsQuery }: { row: Row; jobsQuery: string }) {
  const jobsHref = `/?company=${row.key}${jobsQuery ? `&${jobsQuery}` : ""}`;
  const names = row.directions.map((d) => CATEGORY_META[d.category].short);
  return (
    <li className={cn("border-b border-border py-4", ROW_BLEED)}>
      <div className={cn("grid gap-1.5 lg:items-baseline", COMPANY_GRID)}>
        <div className="grid min-w-0 gap-0.5">
          <h3 className="leading-snug font-semibold">{row.name}</h3>
          {row.description && <p className="text-sm text-muted-foreground">{row.description}</p>}
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
            <span className="font-mono text-foreground tabular-nums">{row.roles}</span> design {row.roles === 1 ? "role" : "roles"}
          </IconText>
        ) : (
          <span className="text-sm text-muted-foreground">
            {row.readable ? "Quiet right now. Worth watching." : "Ping can't see their jobs. Check their page."}
          </span>
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
