/**
 * The mascots' pixel art: 16 x 16 grids, one character per pixel ("." is empty). Shared by the
 * animated mascots (components/mascot.tsx) and the share image (app/opengraph-image.tsx), so both
 * always draw the same figures. Server-safe: no client code here.
 */

export const MASCOT_PALETTE: Record<string, string> = {
  k: "#101014",
  g: "#059669",
  d: "#047857",
  l: "#6ee7b7",
  w: "#ffffff",
  r: "#10b981", // the "ping" signal
};

/** Mascot C, the block. */
export const BLOCK = [
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
];

export const STUDENT = [
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
];
