import Image from "next/image";
import { Mascot, type MascotName } from "@/components/mascot";
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
 * Two light arrangements so Jobs and Market insights don't repeat each other: one small, loose
 * staircase in the top-left corner and two single tiles, leaving the right side to the mascot.
 * Rows below the band's height are clipped, never rescaled, so the 32px pitch holds at every width.
 */
const ARRANGEMENTS: Record<"jobs" | "insights", Cell[]> = {
  jobs: [
    { side: "left", row: 0, col: 0, tile: "stripe_mint_1" },
    { side: "left", row: 1, col: 1, tile: "marble_vivid_1" },
    { side: "left", row: 2, col: 0, tile: "stripe_emerald_1" },
    { side: "left", row: 0, col: 5, tile: "marble_lime_1", className: "hidden sm:block" },
    { side: "right", row: 2, col: 0, tile: "stripe_deep_1" },
  ],
  insights: [
    { side: "left", row: 0, col: 0, tile: "marble_deep_1" },
    { side: "left", row: 1, col: 1, tile: "stripe_mint_1" },
    { side: "left", row: 2, col: 2, tile: "marble_vivid_2" },
    { side: "left", row: 1, col: 7, tile: "stripe_emerald_1", className: "hidden md:block" },
    { side: "right", row: 0, col: 0, tile: "marble_lime_1" },
  ],
};

const MASCOT: Record<keyof typeof ARRANGEMENTS, MascotName> = { jobs: "block", insights: "student" };

/**
 * The hero's tile band: a fixed-height spacer whose height matches the mascot (64px phones,
 * 96px from md, 128px from lg), with every tile and the mascot absolutely placed on the 32px
 * lattice, so nothing can add height or sit behind the headline. The band bleeds out to the
 * frame lines; the mascot stands one cell in from the right frame line.
 */
export function HeroTiles({ variant }: { variant: keyof typeof ARRANGEMENTS }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative -mx-4 h-16 overflow-hidden select-none md:-mx-6 md:h-24 lg:-mx-8 lg:h-32"
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
      <Mascot name={MASCOT[variant]} className="absolute top-0" style={{ right: CELL }} />
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
