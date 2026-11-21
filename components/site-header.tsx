"use client";

import { BellRing } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FRAME_COLUMN } from "@/components/blueprint";
import { DiscordIcon, SlackIcon } from "@/components/brand-icons";
import { LogoMark } from "@/components/logo";
import { openSubscribe, SubscribeDialog } from "@/components/subscribe-dialog";
import { ICON_BUTTON, ICON_SIZE } from "@/components/icon-button";
import { SoundToggle } from "@/components/sound";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeMenu } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Jobs", short: "Jobs" },
  { href: "/insights", label: "Market insights", short: "Insights" },
];

export function Wordmark() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2 font-heading text-lg font-semibold tracking-tight sm:text-xl" aria-label="Ping home">
      {/* Ping's mark: the block mascot's face, 8 x 8 pixels at 2px (phones) or 3px per pixel. */}
      <LogoMark className="size-4 sm:size-6" />
      Ping
    </Link>
  );
}

/**
 * "Get new jobs": opens the email subscription modal. One button for every width (so the manage
 * link from an email opens one dialog): icon only on phones at 44px, icon and label from sm.
 */
export function SubscribeButton() {
  return (
    <SubscribeDialog
      trigger={
        <Button size="sm" className="max-sm:size-11 max-sm:px-0">
          <BellRing data-icon="inline-start" className="max-sm:size-5" strokeWidth={1.75} />
          <span className="max-sm:sr-only">Get new jobs</span>
        </Button>
      }
    />
  );
}

/** Channels that are on the way. Each opens the "Get new jobs" modal at "Where to get them". */
export const SOON_CHANNELS = [
  { name: "Slack", icon: SlackIcon },
  { name: "Discord", icon: DiscordIcon },
] as const;

function ChannelButton({ name, icon: Icon }: (typeof SOON_CHANNELS)[number]) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          // The modal plays its own open sound, so no click on top.
          <button type="button" aria-label={`${name}: coming soon`} data-sound="none" onClick={() => openSubscribe("channels")} className={ICON_BUTTON} />
        }
      >
        <Icon className={ICON_SIZE.glyph} />
      </TooltipTrigger>
      <TooltipContent>{name}: coming soon</TooltipContent>
    </Tooltip>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const tabs = (className?: string) => (
    // Two destinations only, so they stay visible as tabs at every width.
    <nav className={cn("flex items-center", className)} aria-label="Main">
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          aria-current={active(n.href) ? "page" : undefined}
          className={cn(
            "relative flex h-11 items-center px-3 text-sm font-medium transition-colors first:-ml-3 hover:text-brand-sm sm:first:ml-0",
            active(n.href)
              ? "text-foreground after:absolute after:inset-x-3 after:bottom-1.5 after:h-0.5 after:bg-brand-lg"
              : "text-muted-foreground",
          )}
        >
          <span className="sm:hidden">{n.short}</span>
          <span className="hidden sm:inline">{n.label}</span>
        </Link>
      ))}
    </nav>
  );

  return (
    <>
      {/* Sticky row: wordmark and the header buttons; from sm the tabs sit here too. */}
      <header className="sticky top-0 z-40 border-b border-frame-line">
        {/* Only the column is frosted; the gutters keep their hatching. */}
        <div className={cn(FRAME_COLUMN, "flex h-16 items-center gap-3 bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70 sm:gap-6")}>
          <Wordmark />
          {tabs("hidden sm:flex")}
          <div className="ml-auto flex items-center gap-1">
            <SubscribeButton />
            {/* From sm up; on phones they move into the theme menu so "Get new jobs" keeps its place. */}
            <div className="hidden items-center gap-1 sm:flex">
              {SOON_CHANNELS.map((c) => (
                <ChannelButton key={c.name} {...c} />
              ))}
            </div>
            <SoundToggle />
            <ThemeMenu />
          </div>
        </div>
      </header>
      {/* Phones: three 44px buttons leave no room for the tabs in the sticky row, so they get a row of their own. */}
      <div className="border-b border-frame-line sm:hidden">
        <div className={FRAME_COLUMN}>{tabs()}</div>
      </div>
    </>
  );
}
