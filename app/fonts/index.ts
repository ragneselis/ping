import localFont from "next/font/local";

/*
 * Ariata (Monotype), the GrönLoop heading typeface, self-hosted through next/font/local.
 * Licensed by the project owner for use on Ping as well as GrönLoop. Copied from
 * ~/Documents/gronloop/src/app/fonts as woff2; the .otf/.ttf masters stay there.
 *
 * Both cuts are a single Regular master (weight 400, not variable). Headings still ask for 600,
 * so globals.css sets `font-synthesis-weight: none` to keep the real drawn weight instead of a
 * smeared synthetic bold.
 */

/** Display cut: tight spacing for large sizes (headings, readout figures). */
export const ariataDisplay = localFont({
  src: "./ariata-display-regular.woff2",
  weight: "400",
  style: "normal",
  variable: "--font-ariata-display",
  display: "swap",
  fallback: ["var(--font-geist)", "system-ui", "sans-serif"],
  adjustFontFallback: false,
});

/** Text cut: looser spacing for 18 to 30px headings (card titles, direction names). */
export const ariataText = localFont({
  src: "./ariata-text-regular.woff2",
  weight: "400",
  style: "normal",
  variable: "--font-ariata-text",
  display: "swap",
  fallback: ["var(--font-geist)", "system-ui", "sans-serif"],
  adjustFontFallback: false,
});
