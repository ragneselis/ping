import type { ComponentType, CSSProperties, ReactNode, SVGProps } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Ping's square icon buttons, shared by the header (sound, theme, Slack, Discord) and the footer
 * (coffee, GitHub): hairline border, 44px on phones, 32px from sm, emerald border and tint on hover
 * and while open, the focus ring outside. No "use client", so server components can use it too.
 */
export const ICON_BUTTON =
  "flex size-11 [&_svg]:[translate:var(--icon-optical,0_0)] shrink-0 items-center justify-center border border-hairline-strong text-foreground transition-colors hover:border-brand-lg hover:bg-brand-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-expanded:border-brand-lg aria-expanded:bg-brand-tint sm:size-8";

/** Icon sizes inside an icon button: Lucide outline icons, and the filled brand glyphs one step smaller. */
export const ICON_SIZE = { lucide: "size-5 sm:size-4", glyph: "size-4 sm:size-3.5" } as const;

/**
 * Centring in icon-only buttons. The button centres the icon's 24 x 24 box; most Lucide and brand
 * shapes are centred in that box, but a few are drawn off-centre, and the bell reads low. Their
 * offsets, measured from each shape's path bounding box (getBBox) in viewBox units, live here and
 * only here; ButtonIcon turns them into --icon-optical, which ICON_BUTTON and Button's icon-only
 * variant apply as a translate (percent of the icon's own size, so any icon size works).
 *   Coffee     shape spans x 3..22, y 2..21: centre (12.5, 11.5), so move it (-0.5, +0.5)
 *   VolumeX    shape spans x 2..21.5: centre 11.75, so move it +0.25 on x
 *   BellRing   shape is centred (2..22 both ways), but the clapper and the ring marks make it look
 *              low: an optical lift of 0.5 (0.42px at 20px, inside the check's 0.75px tolerance)
 * npm run check:align measures every icon-only button: shape centre within 0.75px of the button centre.
 */
const OPTICAL: Record<string, [number, number]> = {
  Coffee: [-0.5, 0.5],
  VolumeX: [0.25, 0],
  BellRing: [0, -0.5],
};

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { strokeWidth?: number }> & { displayName?: string };

/** An icon inside an icon-only button: the icon, carrying its optical offset (OPTICAL) when it has one. */
export function ButtonIcon({ icon: Icon, style, ...rest }: { icon: IconComponent } & SVGProps<SVGSVGElement> & { strokeWidth?: number; "data-icon"?: string }) {
  const off = OPTICAL[Icon.displayName ?? ""];
  const optical = off ? ({ "--icon-optical": `${(off[0] / 24) * 100}% ${(off[1] / 24) * 100}%` } as CSSProperties) : undefined;
  return <Icon aria-hidden style={{ ...optical, ...style }} {...rest} />;
}

/** An icon button that links out (new tab), with its tooltip. `label` is the accessible name. */
export function IconLink({ href, label, tooltip, children }: { href: string; label: string; tooltip: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={ICON_BUTTON} />}>{children}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
