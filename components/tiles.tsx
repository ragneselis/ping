import type React from "react";
import { Mascot, type MascotName } from "@/components/mascot";
import { cn } from "@/lib/utils";

/*
 * Ping's pixel tiles, in the same pixel world as the mascots. Each tile is an SVG of an 8 x 8 grid
 * of square pixels (shape-rendering crispEdges, no images), drawn only in the brand greens
 * (--px-1 darkest to --px-5 lightest; dark mode swaps the pale end, see globals.css).
 * A 32px tile gives 4px pixels: the mascots draw at 4px per pixel on phones and 8px from md,
 * so every mascot pixel covers exactly 1 x 1 or 2 x 2 tile pixels on one shared 4px grid.
 * Placement keeps GrönLoop's 32px lattice with zero gap; empty cells make a cluster disperse.
 * Tiles are decorative only: out of flow, never behind text, hidden from screen readers.
 */

/** 8 x 8 pixel art; digits pick --px-1 (darkest) to --px-5 (lightest). Flat, no texture. */
const PIXELS = {
  /** One flat green. Used for the freshness tile. */
  solid: Array(8).fill("22222222"),
  /** Pale flat tile. */
  pale: Array(8).fill("55555555"),
  /** Two-tone checker in 2 x 2 blocks. */
  checker: ["22442244", "22442244", "44224422", "44224422", "22442244", "22442244", "44224422", "44224422"],
  /** Dither: scattered light pixels on a deep base. */
  dither: ["11111111", "11141111", "11111114", "14111111", "11111411", "11111111", "11411111", "11111141"],
  /** Diagonal pixel stripe. */
  stripe: ["13331333", "33313331", "33133313", "31333133", "13331333", "33313331", "33133313", "31333133"],
  /** A single lighter pixel in the top-left corner. */
  corner: ["42222222", "22222222", "22222222", "22222222", "22222222", "22222222", "22222222", "22222222"],
} satisfies Record<string, string[]>;

export type TileName = keyof typeof PIXELS;

/** The light-theme greens behind --px-1 to --px-5, for places that need a fixed palette (the snake board). */
export const TILE_PALETTE = ["#047857", "#059669", "#10b981", "#6ee7b7", "#d1fae5"] as const;

/**
 * A tile as an SVG data URI, for elements created outside React (the snake's segments). Same 8 x 8
 * pixel grid and crispEdges as <Tile>, in the fixed palette.
 */
export function tileDataUri(name: TileName): string {
  const rows = PIXELS[name];
  const rects = rows
    .flatMap((row, y) => [...row].map((px, x) => `<rect x="${x}" y="${y}" width="1" height="1" fill="${TILE_PALETTE[Number(px) - 1]}"/>`))
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges">${rects}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** One pixel tile. Size it in whole multiples of 8px (8, 16, 32) so pixels stay integer and crisp. */
export function Tile({ name, className, style, ...rest }: { name: TileName; className?: string; style?: React.CSSProperties; "data-tile-in"?: string }) {
  const rows = PIXELS[name];
  const flat = rows.every((r) => r === rows[0]) && new Set(rows[0]).size === 1;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 8 8"
      shapeRendering="crispEdges"
      className={cn("inline-block size-3 shrink-0", className)}
      style={style}
      {...rest}
    >
      {flat ? (
        <rect width="8" height="8" fill={`var(--px-${rows[0][0]})`} />
      ) : (
        rows.flatMap((row, y) => [...row].map((px, x) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={`var(--px-${px})`} />))
      )}
    </svg>
  );
}

/** Lattice pitch in px. Tiles are exactly this wide, so cells butt together. */
const CELL = 32;

type Cell = {
  /** Lattice row from the top of the band. */
  row: number;
  /** Lattice column counted inward from the anchor edge. */
  col: number;
  tile: TileName;
  side: "left" | "right";
  /** Used only to hold tiles back on narrow columns. */
  className?: string;
};

/**
 * Two light arrangements so Jobs and Market insights don't repeat each other: one small, loose
 * staircase in the top-left corner and two single tiles, leaving the right side to the mascot.
 * Rows below the band's height are clipped, never rescaled, so the 32px pitch holds at every width.
 */
const ARRANGEMENTS: Record<"jobs" | "discover" | "insights", Cell[]> = {
  jobs: [
    { side: "left", row: 0, col: 0, tile: "pale" },
    { side: "left", row: 1, col: 1, tile: "dither" },
    { side: "left", row: 2, col: 0, tile: "checker" },
    { side: "left", row: 0, col: 5, tile: "corner", className: "hidden sm:block" },
    { side: "right", row: 2, col: 0, tile: "stripe" },
  ],
  discover: [
    { side: "left", row: 0, col: 1, tile: "checker" },
    { side: "left", row: 1, col: 0, tile: "stripe" },
    { side: "left", row: 2, col: 1, tile: "pale" },
    { side: "left", row: 0, col: 6, tile: "dither", className: "hidden sm:block" },
    { side: "right", row: 2, col: 1, tile: "corner" },
  ],
  insights: [
    { side: "left", row: 0, col: 0, tile: "dither" },
    { side: "left", row: 1, col: 1, tile: "pale" },
    { side: "left", row: 2, col: 2, tile: "stripe" },
    { side: "left", row: 1, col: 7, tile: "checker", className: "hidden md:block" },
    { side: "right", row: 0, col: 0, tile: "corner" },
  ],
};

const MASCOT: Record<keyof typeof ARRANGEMENTS, MascotName> = { jobs: "block", discover: "scout", insights: "student" };

/**
 * The hero's tile band: a fixed-height spacer whose height matches the mascot (64px on phones,
 * 128px from md), with every tile and the mascot absolutely placed on the 32px
 * lattice, so nothing can add height or sit behind the headline. The band bleeds out to the
 * frame lines; the mascot stands one cell in from the right frame line.
 */
export function HeroTiles({ variant }: { variant: keyof typeof ARRANGEMENTS }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative -mx-4 h-16 overflow-hidden select-none md:-mx-6 md:h-32 lg:-mx-8"
    >
      {/* On load the tiles pop in one by one, like pixels arriving (globals.css, data-tile-in). */}
      {ARRANGEMENTS[variant].map((c, i) => (
        <Tile
          key={`${c.side}-${c.row}-${c.col}`}
          name={c.tile}
          className={cn("absolute size-8", c.className)}
          data-tile-in=""
          style={{ top: c.row * CELL, [c.side]: c.col * CELL, "--i": i } as React.CSSProperties}
        />
      ))}
      <Mascot name={MASCOT[variant]} className="absolute top-0" style={{ right: CELL }} />
    </div>
  );
}

/** The freshness marker: a tiny emerald tile that pulses softly (still under reduced motion). */
export function FreshTile({ className }: { className?: string }) {
  return <Tile name="solid" className={cn("tile-pulse size-2", className)} />;
}
