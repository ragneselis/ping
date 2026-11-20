"use client";

import { BellRing } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FRAME_COLUMN } from "@/components/blueprint";
import { SubscribeDialog } from "@/components/subscribe-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Jobs", short: "Jobs" },
  { href: "/insights", label: "Market insights", short: "Insights" },
];

export function Wordmark() {
  return (
    <Link href="/" className="group flex items-center gap-2 text-xl font-bold tracking-tight" aria-label="Ping home">
      <span className="relative flex size-3">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
        <span className="relative inline-flex size-3 rounded-full bg-primary" />
      </span>
      Ping
    </Link>
  );
}

/** "Get new jobs" is not live yet, so it is an outline button with a "soon" tag rather than a pink action. */
export function SubscribeButton({ compact = false }: { compact?: boolean }) {
  return (
    <SubscribeDialog
      trigger={
        <Button variant="outline" size="sm" aria-label={compact ? "Get new jobs (coming soon)" : undefined} className={cn(compact && "size-9 px-0")}>
          <BellRing data-icon={compact ? undefined : "inline-start"} />
          {!compact && (
            <>
              Get new jobs
              <span className="rounded-sm bg-muted px-1 font-mono text-[0.7rem] text-muted-foreground uppercase">soon</span>
            </>
          )}
        </Button>
      }
    />
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-frame-line">
      {/* Only the column is frosted; the gutters keep their hatching. */}
      <div className={cn(FRAME_COLUMN, "flex h-16 items-center gap-3 bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70 sm:gap-6")}>
        <Wordmark />
        {/* Two destinations only, so they stay visible as tabs at every width. */}
        <nav className="flex items-center" aria-label="Main">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active(n.href) ? "page" : undefined}
              className={cn(
                "relative flex h-11 items-center px-2.5 text-sm font-medium transition-colors hover:text-foreground sm:px-3",
                active(n.href)
                  ? "text-foreground after:absolute after:inset-x-2.5 after:bottom-2 after:h-0.5 after:rounded-full after:bg-primary sm:after:inset-x-3"
                  : "text-muted-foreground",
              )}
            >
              <span className="sm:hidden">{n.short}</span>
              <span className="hidden sm:inline">{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <div className="hidden sm:block">
            <SubscribeButton />
          </div>
          <div className="sm:hidden">
            <SubscribeButton compact />
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
