/**
 * Writes the favicons from the 8 x 8 logo (lib/logo.ts), every one at a whole-pixel scale so it stays
 * crisp: app/icon.svg (modern browsers), PNG fallbacks at 16, 32, 48, 192 and 512 px, and the
 * apple-touch-icon (app/apple-icon.png, 180 px: the face at 22 px per pixel on a 2 px green margin,
 * which blends in because the face's edge is green too). Next.js turns these files into <link> tags.
 *
 *   npm run icons
 */
import { writeFileSync } from "node:fs";
import { crc32, deflateSync } from "node:zlib";
import { LOGO_COLORS, LOGO_ROWS, logoSvg } from "@/lib/logo";

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

/** An RGB PNG of the logo: `scale` px per logo pixel, `margin` px of green around it. */
function png(scale: number, margin = 0) {
  const size = 8 * scale + 2 * margin;
  const green = hex(LOGO_COLORS.g);
  const rows: Buffer[] = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3); // filter byte 0, then RGB
    for (let x = 0; x < size; x++) {
      const lx = Math.floor((x - margin) / scale);
      const ly = Math.floor((y - margin) / scale);
      const inside = x >= margin && y >= margin && lx < 8 && ly < 8;
      const c = inside ? hex(LOGO_COLORS[LOGO_ROWS[ly][lx] as keyof typeof LOGO_COLORS]) : green;
      row.set(c, 1 + x * 3);
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8-bit, truecolour, default compression, filter, no interlace
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const out: [string, Buffer | string][] = [
  ["app/icon.svg", logoSvg()],
  ["app/icon1.png", png(2)], // 16
  ["app/icon2.png", png(4)], // 32
  ["app/icon3.png", png(6)], // 48
  ["app/icon4.png", png(24)], // 192
  ["app/icon5.png", png(64)], // 512
  ["app/apple-icon.png", png(22, 2)], // 180
];
for (const [file, data] of out) writeFileSync(file, data);
console.log(`Wrote ${out.map(([f]) => f).join(", ")}`);
