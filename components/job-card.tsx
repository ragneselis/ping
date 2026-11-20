import { ArrowUpRight, CalendarDays, MapPin, Wifi } from "lucide-react";
import { CategoryTag } from "@/components/category";
import { LevelTag, RequirementChip, SignalTag } from "@/components/signal";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CATEGORY_META, REMOTE_LABEL } from "@/lib/categories";
import type { JobCard as Job } from "@/lib/view";

/** "today", "3 days ago", "2 weeks ago" relative to now. */
export function postedAgo(iso: string | null, now = Date.now()): string {
  if (!iso) return "Date not stated";
  const days = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 86_400_000));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

/**
 * A job. The title is the only link (stretched over the card), so assistive tech reads
 * "title, company" instead of the whole card. Three subgrid rows (header, meta, chips)
 * keep cards in the same row aligned.
 */
export function JobCard({ job }: { job: Job }) {
  return (
    <article className="group relative row-span-3 grid grid-rows-subgrid">
      <Card className="row-span-3 grid grid-rows-subgrid gap-3 transition-colors group-hover:[--cut-line:var(--color-primary)] group-has-[a:focus-visible]:[--cut-line:var(--color-ring)]">
        <CardHeader className="content-start gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <CategoryTag category={job.primary} />
            {job.secondary && <span className="text-xs text-muted-foreground">also {CATEGORY_META[job.secondary].short}</span>}
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="grid min-w-0 gap-0.5">
              <h3 className="line-clamp-2 text-lg leading-snug font-semibold text-balance group-hover:text-primary" title={job.title}>
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
                >
                  {job.title}
                  <span className="sr-only">, {job.company} (opens the original posting)</span>
                </a>
              </h3>
              <p className="text-sm font-medium text-muted-foreground">{job.company}</p>
              <LevelTag level={job.level} />
            </div>
            <ArrowUpRight
              aria-hidden
              className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
            />
          </div>
        </CardHeader>
        <CardContent className="self-end">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {job.withinReach && <SignalTag kind="reach" />}
            {job.openToEstonia && <SignalTag kind="estonia" />}
            <span className="flex min-w-0 items-center gap-1.5">
              <MapPin aria-hidden className="size-3.5 shrink-0" />
              <span className="truncate">{job.location || "Location not stated"}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Wifi aria-hidden className="size-3.5" />
              {REMOTE_LABEL[job.remote] ?? job.remote}
            </span>
            <span className="flex items-center gap-1.5 font-mono text-xs">
              <CalendarDays aria-hidden className="size-3.5" />
              {postedAgo(job.postedAt)}
            </span>
          </div>
        </CardContent>
        <CardContent className="self-end">
          {job.chips.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5" aria-label="Top requirements">
              {job.chips.map((c) => (
                <RequirementChip key={c}>{c}</RequirementChip>
              ))}
            </ul>
          ) : (
            <p className="font-mono text-xs text-muted-foreground">No requirements listed</p>
          )}
        </CardContent>
      </Card>
    </article>
  );
}
