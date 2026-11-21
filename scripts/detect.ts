/**
 * Which job system a careers page uses, and whether Ping can read its board (lib/sources/detect.ts).
 *
 *   npm run detect -- https://example.com/careers [more urls]
 *   npm run detect -- "Company name=https://example.com/careers"   (also tries board names guessed from the name)
 */
import { detectBoard } from "../lib/sources/detect";

async function main() {
  const urls = process.argv.slice(2);
  if (!urls.length) return console.log("Usage: npm run detect -- <careers url> [more]");
  for (const arg of urls) {
    const [name, url] = arg.includes("=") ? [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)] : [undefined, arg];
    const r = await detectBoard(url, name);
    console.log(r.ok ? `${url}\n  ${r.board.ats} ${r.board.slug}${r.board.eu ? " (EU)" : ""}: readable, ${r.roles} open roles (found via ${r.via})` : `${url}\n  not added: ${r.reason}`);
  }
}

main();
