import { readFileSync } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import { BLOCK, MASCOT_PALETTE } from "@/lib/mascots";

/*
 * The share image for every page (og:image; app/twitter-image.tsx reuses it). Generated from code
 * at build time, so it always matches the site: the mascot tile's light green, the word "Ping" in
 * the heading face (Quantico Bold, 700, the same face and weight the site's headings use),
 * and the block mascot drawn from its 16 x 16 grid (lib/mascots.ts) at a whole 24px per pixel.
 */

export const alt = "Ping";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#d1fae5";
const INK = "#101014";
const PX = 24; // whole-number scale: 16 x 24 = 384px

export default function OpengraphImage() {
  const font = readFileSync(path.join(process.cwd(), "assets/fonts/Quantico-Bold.ttf"));
  const pixels = BLOCK.flatMap((row, y) =>
    [...row].map((c, x) =>
      c === "." ? null : (
        <div key={`${x}-${y}`} style={{ position: "absolute", left: x * PX, top: y * PX, width: PX, height: PX, background: MASCOT_PALETTE[c] }} />
      ),
    ),
  );
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 56, background: BG }}>
        <div style={{ display: "flex", fontFamily: "Quantico", fontWeight: 700, fontSize: 232, letterSpacing: "-0.01em", color: INK, lineHeight: 1 }}>Ping</div>
        <div style={{ display: "flex", position: "relative", width: 16 * PX, height: 16 * PX }}>{pixels}</div>
      </div>
    ),
    { ...size, fonts: [{ name: "Quantico", data: font, weight: 700, style: "normal" }] },
  );
}
