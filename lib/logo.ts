/**
 * Ping's logo: the block mascot's face on an 8 x 8 pixel grid. One source for the header wordmark
 * (components/logo.tsx), the email templates and the favicons (scripts/icons.ts).
 * Draw it only at whole-pixel scales (8, 16, 24, 32 px ...) so every pixel stays crisp.
 */
export const LOGO_ROWS = [
  "gggggggg",
  "gggggggg",
  "ggwkgwkg",
  "ggwkgwkg",
  "gggggggg",
  "gggggggg",
  "gggkkkgg",
  "gggggggg",
] as const;

export const LOGO_COLORS = { g: "#059669", w: "#ffffff", k: "#101014" } as const;

/** The logo as a standalone SVG document (favicon). */
export function logoSvg(): string {
  const rects = LOGO_ROWS.flatMap((row, y) =>
    [...row].map((c, x) => (c === "g" ? "" : `<rect x="${x}" y="${y}" width="1" height="1" fill="${LOGO_COLORS[c as "w" | "k"]}"/>`)),
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges"><rect width="8" height="8" fill="${LOGO_COLORS.g}"/>${rects}</svg>\n`;
}
