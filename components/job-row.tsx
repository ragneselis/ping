import type React from "react";
import { OWN_CLICK_SOUND } from "@/lib/sound";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { CategoryLabel } from "@/components/category";
import { LevelTag, RequirementList, SignalTag } from "@/components/signal";
import { FreshTile } from "@/components/tiles";
import { CATEGORY_META, REMOTE_LABEL } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { JobCard as Job } from "@/lib/view";
import { IconText } from "@/components/icon-text";

/** Columns of the jobs table from lg up: direction, role, location, level, signals, posted, arrow. Shared by the header row. */
export const JOB_GRID =
  "lg:grid-cols-[9.5rem_minmax(0,1fr)_10rem_6.5rem_8.5rem_4rem_1rem] lg:gap-x-5 2xl:grid-cols-[11rem_minmax(0,1fr)_14rem_7rem_9rem_4.5rem_1rem] 2xl:gap-x-6";
/** Rows bleed to the frame lines, so the hover fill and the hairlines run edge to edge. */
export const ROW_BLEED = "-mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8";

/** Compact age for a table cell: "Today", "3 days", "2 wks", "4 mos". */
export function postedShort(iso: string | null, now = Date.now()): string {
  if (!iso) return "n/a";
  const days = Math.max(
    0,
    Math.floor((now - new Date(iso).getTime()) / 86_400_000),
  );
  if (days === 0) return "Today";
  if (days < 14) return `${days} day${days === 1 ? "" : "s"}`;
  if (days < 60) return `${Math.floor(days / 7)} wks`;
  return `${Math.floor(days / 30)} mos`;
}

const fullDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Date not stated";

/**
 * One job as a table row. The title is the only link, stretched over the row, so assistive tech reads
 * "title, company" instead of every cell. From lg up the cells sit in the shared JOB_GRID columns;
 * on phones the row stacks into title, company and one line of meta.
 */
export function JobRow({
  job,
  isNew,
  similar = [],
  reveal,
}: {
  job: Job;
  isNew: boolean;
  similar?: Job[];
  /** Stagger position for rows on the first screen; rows with it rise into view once. */
  reveal?: number;
}) {
  const setup = REMOTE_LABEL[job.remote] ?? job.remote;
  const location = job.location || "Location not stated";
  const posted = (
    <time dateTime={job.postedAt ?? undefined} title={fullDate(job.postedAt)}>
      {postedShort(job.postedAt)}
    </time>
  );
  return (
    // Hover is a faint neutral fill; the direction label keeps AA on it (amber-700 at 4.7:1 is the lowest).
    <li
      data-row=""
      data-reveal={reveal === undefined ? undefined : ""}
      style={reveal === undefined ? undefined : ({ "--reveal-i": reveal } as React.CSSProperties)}
      className={cn(
        "group relative border-b border-border py-4 transition-[background-color] duration-(--dur-fast) ease-(--ease-out) hover:bg-muted/60 has-[a[data-main]:focus-visible]:bg-muted/60 has-[a[data-main]:focus-visible]:outline-2 has-[a[data-main]:focus-visible]:-outline-offset-2 has-[a[data-main]:focus-visible]:outline-ring",
        ROW_BLEED,
      )}
    >
      <div className={cn("grid gap-1 lg:items-baseline", JOB_GRID)}>
        <div className="hidden min-w-0 gap-1 lg:grid">
          <CategoryLabel category={job.primary} />
          {job.secondary && (
            <span className="pl-4 text-xs text-muted-foreground">
              also {CATEGORY_META[job.secondary].short}
            </span>
          )}
        </div>

        <div className="grid min-w-0 gap-0.5 pr-8 lg:pr-0">
          <h3 className="leading-snug font-semibold">
            {/* Hangs in the gap before the title, so titles stay aligned down the column. */}
            {isNew && <FreshTile className="icon-hang -ml-3.5 mr-1.5" />}
            <a
              data-main
              data-job-id={job.id}
              data-job-category={job.primary}
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
            >
              {isNew && <span className="sr-only">New this trip: </span>}
              {job.title}
              <span className="sr-only">
                , {job.company} (opens the original posting)
              </span>
            </a>
          </h3>
          <p className="text-sm text-foreground/80">{job.company}</p>
          <RequirementList
            items={job.chips.slice(0, 3)}
            className="mt-1 hidden lg:block"
          />
          {similar.length > 0 && <SimilarJobs job={job} similar={similar} />}
          {/* Phones: one line of meta under the company. */}
          <div className="mt-1.5 baseline-row flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground lg:hidden">
            <CategoryLabel category={job.primary} className="text-xs" />
            <span>{location}</span>
            <span>{setup}</span>
            <LevelTag level={job.level} className="text-[0.7rem]" />
            <span className="font-mono">{posted}</span>
            {job.withinReach && <SignalTag kind="reach" />}
            {job.openToEstonia && <SignalTag kind="estonia" />}
          </div>
        </div>

        <div className="hidden min-w-0 gap-0.5 text-sm lg:grid">
          <span className="truncate" title={location}>
            {location}
          </span>
          <span className="text-muted-foreground">{setup}</span>
        </div>
        <LevelTag level={job.level} className="hidden lg:block" />
        <div className="hidden gap-1 text-sm lg:grid">
          {job.withinReach && <SignalTag kind="reach" />}
          {job.openToEstonia && <SignalTag kind="estonia" />}
        </div>
        <span className="hidden font-mono text-xs text-muted-foreground tabular-nums lg:block">
          {posted}
        </span>
        <ArrowUpRight
          aria-hidden
          className="absolute top-4 right-4 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground md:right-6 lg:static lg:mt-0.5 lg:self-start"
        />
      </div>
    </li>
  );
}

/**
 * Near-identical postings from the same company, folded under the first one. Native <details>,
 * lifted above the row's stretched link so it stays clickable.
 */
function SimilarJobs({ job, similar }: { job: Job; similar: Job[] }) {
  return (
    <details data-expander="" className="group/similar relative z-10 mt-2 w-fit max-lg:order-last">
      <IconText
        as="summary"
        {...OWN_CLICK_SOUND}
        className="min-h-11 w-fit list-none flex-wrap content-center gap-1.5 text-sm font-medium text-brand-sm select-none hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:min-h-0 [&::-webkit-details-marker]:hidden"
        icon={<ChevronDown className="size-4 transition-transform group-open/similar:rotate-180" />}
      >
        +{similar.length} similar from {job.company}
      </IconText>
      <ul className="mt-2 grid gap-2 border-l border-border pl-3">
        {similar.map((s) => (
          <li key={s.id} className="text-sm">
            <a
              data-job-id={s.id}
              data-job-category={s.primary}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {s.title}
              <span className="sr-only"> (opens the original posting)</span>
            </a>
            <span className="block text-xs text-muted-foreground">
              {s.location || "Location not stated"}{" "}
              <span className="font-mono">{postedShort(s.postedAt)}</span>
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
