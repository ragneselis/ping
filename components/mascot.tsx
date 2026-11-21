import type React from "react";
import { cn } from "@/lib/utils";

/*
 * Ping's pixel mascots. Original 16 x 16 pixel art, drawn as one <rect> per pixel with
 * shape-rendering="crispEdges", sized 64px on phones and 128px from md: 4 or 8px per pixel, so
 * each mascot pixel covers exactly 1 x 1 or 2 x 2 pixels of the 4px tile grid and nothing is resampled. Each sits on its own square tile (--mascot-tile-*),
 * which turns dark emerald in dark mode; the pixel colours stay the same in both themes.
 * Decorative only: aria-hidden, never covering text, no animation.
 */

const PALETTE: Record<string, string> = {
  k: "#101014",
  g: "#059669",
  d: "#047857",
  l: "#6ee7b7",
  w: "#ffffff",
};

const ART = {
  /** "The block": Jobs hero. */
  block: [
    "................",
    "................",
    "..kkkkkkkkkkkk..",
    "..kgdgggggggdk..",
    "..kggggggggggk..",
    "..kggwkggwkggk..",
    "..kggwkggwkggk..",
    ".kkggggggggggkk.",
    "k.kgggkkkggggk.k",
    "..kgggggggggdk..",
    "..kdgggggggggk..",
    "..kgggggggdggk..",
    "..kkkkkkkkkkkk..",
    "...kk......kk...",
    "...kk......kk...",
    "................",
  ],
  /** "The student": Market insights hero. */
  student: [
    "................",
    "................",
    ".....kkkkkk.....",
    "....kkkkkkkk....",
    "...kkkkkkkkkk...",
    "...kkwwwwwwkk...",
    "...kwwwwwwwwk...",
    "...kwkwwwwkwk...",
    "...kwwwwwwwwk...",
    "...kwwwkkwwwk...",
    "....kwwwwwwk....",
    ".....kkkkkk.....",
    "....kddddddk....",
    "...kddllddddk...",
    "...kddddddddk...",
    "...kddddddddk...",
  ],
} as const;

export type MascotName = keyof typeof ART;

/** Sizes are integer scales on the tile grid only: 4px (64) or 8px (128) per pixel. */
export function Mascot({ name, className, style }: { name: MascotName; className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={cn("block size-16 shrink-0 md:size-32", className)}
      style={style}
    >
      <rect width="16" height="16" fill={`var(--mascot-tile-${name})`} />
      {ART[name].flatMap((row, y) =>
        [...row].map((px, x) => (px === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={PALETTE[px]} />)),
      )}
    </svg>
  );
}
