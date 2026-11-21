import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Ping's square icon buttons, shared by the header (sound, theme, Slack, Discord) and the footer
 * (coffee, GitHub): hairline border, 44px on phones, 32px from sm, emerald border and tint on hover
 * and while open, the focus ring outside. No "use client", so server components can use it too.
 */
export const ICON_BUTTON =
  "flex size-11 shrink-0 items-center justify-center border border-hairline-strong text-foreground transition-colors hover:border-brand-lg hover:bg-brand-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-expanded:border-brand-lg aria-expanded:bg-brand-tint sm:size-8";

/** Icon sizes inside an icon button: Lucide outline icons, and the filled brand glyphs one step smaller. */
export const ICON_SIZE = { lucide: "size-5 sm:size-4", glyph: "size-4 sm:size-3.5" } as const;

/** An icon button that links out (new tab), with its tooltip. `label` is the accessible name. */
export function IconLink({ href, label, tooltip, children }: { href: string; label: string; tooltip: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={ICON_BUTTON} />}>{children}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
