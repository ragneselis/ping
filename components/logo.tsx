import { LOGO_COLORS, LOGO_ROWS } from "@/lib/logo";
import { cn } from "@/lib/utils";

/**
 * The Ping mark: the block mascot's face, 8 x 8 pixels (lib/logo.ts). Size it in whole multiples of
 * 8px (size-4 = 2px per pixel, size-6 = 3px) so it stays crisp. The same colours in both themes.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 8 8" shapeRendering="crispEdges" className={cn("block size-4 shrink-0", className)}>
      <rect width="8" height="8" fill={LOGO_COLORS.g} />
      {LOGO_ROWS.flatMap((row, y) =>
        [...row].map((c, x) => (c === "g" ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={LOGO_COLORS[c as "w" | "k"]} />)),
      )}
    </svg>
  );
}
