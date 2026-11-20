import { ArrowUpRight, CalendarDays, MapPin, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

export function JobCard({ job }: { job: Job }) {
  return (
    <a
      href={job.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card className="h-full gap-3 transition-shadow group-hover:shadow-lg group-hover:ring-primary/40">
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className="font-mono">{CATEGORY_META[job.primary].short}</Badge>
            {job.secondary && (
              <Badge variant="outline" className="h-4 px-1.5 font-mono text-[0.65rem]">
                + {CATEGORY_META[job.secondary].short}
              </Badge>
            )}
            {job.openToEstonia && (
              <Badge variant="secondary" className="font-mono">
                Open to Estonia
              </Badge>
            )}
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg leading-snug font-semibold text-balance group-hover:text-primary">{job.title}</h3>
              <p className="text-sm font-medium text-muted-foreground">{job.company}</p>
            </div>
            <ArrowUpRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
          </div>
        </CardHeader>
        <CardContent className="mt-auto grid gap-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{job.location || "Location not stated"}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Wifi className="size-3.5" />
              {REMOTE_LABEL[job.remote] ?? job.remote}
            </span>
            <span className="flex items-center gap-1.5 font-mono text-xs">
              <CalendarDays className="size-3.5" />
              {postedAgo(job.postedAt)}
            </span>
          </div>
          {job.chips.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Top requirements">
              {job.chips.map((c) => (
                <li key={c} className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  {c}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </a>
  );
}
