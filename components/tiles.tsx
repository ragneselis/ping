import Image from "next/image";
import { cn } from "@/lib/utils";

/*
 * GrönLoop's tile motif, ported from ~/Documents/gronloop (src/components/hero/hero-tiles.tsx).
 * Nine 64px opaque PNGs in /public/tiles, drawn at 32px on a 32px lattice with zero gap;
 * empty lattice cells, not margins, make a cluster read as dispersing.
 * Tiles are decorative only: out of flow, never behind text, hidden from screen readers.
 */

export type TileName =
  | "marble_deep_1"
  | "marble_lime_1"
  | "marble_mint_1"
  | "marble_mint_2"
  | "marble_vivid_1"
  | "marble_vivid_2"
  | "stripe_deep_1"
  | "stripe_emerald_1"
  | "stripe_mint_1";

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
 * Two arrangements so Jobs and Market insights don't repeat each other. Both keep GrönLoop's
 * staircase falling away from the outer corners, then let a few stray tiles drift along the
 * top edge. Stray tiles are held back below md, where the two corners would meet.
 */
const ARRANGEMENTS: Record<"jobs" | "insights", Cell[]> = {
  jobs: [
    { side: "left", row: 0, col: 0, tile: "stripe_mint_1" },
    { side: "left", row: 0, col: 2, tile: "stripe_deep_1" },
    { side: "left", row: 1, col: 1, tile: "marble_vivid_1" },
    { side: "left", row: 2, col: 0, tile: "stripe_emerald_1" },
    { side: "left", row: 0, col: 4, tile: "marble_lime_1", className: "hidden sm:block" },
    { side: "left", row: 1, col: 7, tile: "marble_mint_2", className: "hidden lg:block" },
    { side: "right", row: 0, col: 0, tile: "marble_vivid_2" },
    { side: "right", row: 1, col: 0, tile: "stripe_mint_1" },
    { side: "right", row: 0, col: 2, tile: "marble_deep_1" },
    { side: "right", row: 2, col: 1, tile: "stripe_emerald_1" },
    { side: "right", row: 0, col: 6, tile: "marble_lime_1", className: "hidden md:block" },
    { side: "right", row: 1, col: 11, tile: "stripe_deep_1", className: "hidden xl:block" },
  ],
  insights: [
    { side: "left", row: 0, col: 0, tile: "marble_deep_1" },
    { side: "left", row: 1, col: 0, tile: "marble_vivid_2" },
    { side: "left", row: 0, col: 1, tile: "stripe_mint_1" },
    { side: "left", row: 2, col: 2, tile: "marble_lime_1", className: "hidden sm:block" },
    { side: "left", row: 0, col: 5, tile: "stripe_emerald_1", className: "hidden md:block" },
    { side: "left", row: 1, col: 9, tile: "marble_mint_1", className: "hidden xl:block" },
    { side: "right", row: 0, col: 0, tile: "stripe_emerald_1" },
    { side: "right", row: 0, col: 1, tile: "marble_mint_2" },
    { side: "right", row: 1, col: 2, tile: "stripe_deep_1" },
    { side: "right", row: 2, col: 0, tile: "marble_vivid_1" },
    { side: "right", row: 0, col: 4, tile: "marble_lime_1", className: "hidden sm:block" },
    { side: "right", row: 1, col: 8, tile: "stripe_mint_1", className: "hidden lg:block" },
  ],
};

/**
 * The hero's tile band: a fixed-height spacer (two lattice rows on phones, three from 960px)
 * whose tiles are absolutely placed, so they can never add height or sit behind the headline.
 * It bleeds out to the frame lines, so column 0 of each corner lands on the frame.
 */
export function HeroTiles({ variant }: { variant: keyof typeof ARRANGEMENTS }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative -mx-4 h-16 overflow-hidden select-none md:-mx-6 lg:-mx-8 min-[960px]:h-25 min-[960px]:overflow-visible"
    >
      {ARRANGEMENTS[variant].map((c) => (
        <Image
          key={`${c.side}-${c.row}-${c.col}`}
          src={`/tiles/${c.tile}.png`}
          alt=""
          aria-hidden="true"
          width={64}
          height={64}
          priority
          className={cn("absolute size-8", c.className)}
          style={{ top: c.row * CELL, [c.side]: c.col * CELL }}
        />
      ))}
    </div>
  );
}

/** One small tile, e.g. the Ping logo mark. */
export function Tile({ name, className }: { name: TileName; className?: string }) {
  return <Image src={`/tiles/${name}.png`} alt="" aria-hidden="true" width={64} height={64} className={cn("inline-block size-3 shrink-0", className)} />;
}

/** The freshness marker: a tiny emerald tile that pulses softly (still under reduced motion). */
export function FreshTile({ className }: { className?: string }) {
  return <Tile name="marble_vivid_1" className={cn("tile-pulse size-2", className)} />;
}
