/**
 * Alignment guard. Fails when an icon, dot or glyph next to text is off its first line's cap height, or
 * when words in a baseline-row are off one baseline (the rules in app/globals.css and docs/DEVELOPMENT.md).
 *
 * Measured: every icon slot of <IconText> (data-icon-slot), every icon directly inside a Button or Badge,
 * every hanging icon (icon-hang), and every element whose computed style is a baseline-aligned flex row
 * with the baseline-row class. Pages: Jobs, Discover, Market insights and /stats (with STATS_PASSWORD),
 * at 1440px and 375px, light and dark. One extra case narrows the Jobs data note so it wraps.
 *
 *   npm run check:align
 */
import { expect, test, type Page } from "@playwright/test";

const ICON_TOLERANCE = 0.75;
const BASELINE_TOLERANCE = 0.6;

const PAGES = ["/", "/discover", "/insights", ...(process.env.STATS_PASSWORD ? ["/stats"] : [])];
const SIZES = [
  { name: "1440", width: 1440, height: 900, isMobile: false, deviceScaleFactor: 1 },
  { name: "375", width: 375, height: 812, isMobile: true, deviceScaleFactor: 2 },
  // iPhone 15: 393 x 852 CSS pixels at 3x, as Safari on the phone renders it (baseline rounding differs by scale).
  { name: "iphone15", width: 393, height: 852, isMobile: true, deviceScaleFactor: 3 },
];
const THEMES = ["light", "dark"] as const;

interface Report {
  offsets: { label: string; off: number }[];
  icons: number;
  rows: number;
  wrapped: number;
  failures: string[];
}

/** Runs in the page: measures every pairing and returns the failures. */
async function measure(page: Page): Promise<Report> {
  return page.evaluate(
    ({ ICON_TOLERANCE, BASELINE_TOLERANCE }) => {
      const canvas = document.createElement("canvas").getContext("2d")!;
      const failures: string[] = [];
      let icons = 0;
      let rows = 0;
      let wrapped = 0;
      const offsets: { label: string; off: number }[] = [];

      const shown = (el: Element) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 0.5 && r.height > 0.5 && cs.visibility !== "hidden" && cs.display !== "none" && !el.closest(".sr-only, [hidden]");
      };
      const firstText = (root: Node | null): Text | null => {
        if (!root) return null;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
          acceptNode: (t) => (t.textContent!.trim() && !t.parentElement!.closest("svg, .sr-only, [data-icon-slot]") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
        });
        return walker.nextNode() as Text | null;
      };
      /** First line of a text node: its baseline, its cap middle, and how many lines the element has. */
      const lineOf = (t: Text) => {
        const range = document.createRange();
        range.selectNodeContents(t);
        const rects = [...range.getClientRects()].filter((r) => r.width > 0);
        if (!rects.length) return null;
        const cs = getComputedStyle(t.parentElement!);
        canvas.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const cap = canvas.measureText("H").actualBoundingBoxAscent;
        // The rendered baseline, read from the page: a zero-size inline box placed before the text sits on it.
        const probe = document.createElement("span");
        probe.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline;padding:0;margin:0;border:0";
        t.parentNode!.insertBefore(probe, t);
        const baseline = probe.getBoundingClientRect().bottom;
        probe.remove();
        return { baseline, capMid: baseline - cap / 2, lines: new Set(rects.map((r) => Math.round(r.top))).size };
      };
      const describe = (el: Element) => {
        const text = (el.closest("[data-icon-text], button, a, [data-slot]") ?? el).textContent?.trim().replace(/\s+/g, " ").slice(0, 40);
        const host = el.closest("[data-icon-text], [data-slot]")?.parentElement;
        const where = host ? `${host.tagName.toLowerCase()}.${(host.getAttribute("class") ?? "").split(" ").slice(0, 4).join(".")}` : "";
        return `${el.tagName.toLowerCase()}.${(el.getAttribute("class") ?? "").split(" ").slice(0, 3).join(".")} "${text}" in ${where}`;
      };
      /** The visible mark inside a slot: its icon box (the svg, not the paths drawn in it), else the innermost element (a dot). */
      const markOf = (slot: Element) =>
        slot.querySelector("svg") ?? [...slot.querySelectorAll("*")].reverse().find((e) => !e.children.length && shown(e)) ?? slot;

      /** Visual lines of a whole element's text. */
      const linesIn = (el: Element | null) => {
        if (!el) return 0;
        const range = document.createRange();
        range.selectNodeContents(el);
        // Screen-reader-only text renders as a 1px box: not a visual line.
        return new Set([...range.getClientRects()].filter((r) => r.width > 1 && r.height > 2).map((r) => Math.round(r.top))).size;
      };
      const check = (mark: Element, text: Text | null, label: string, container?: Element | null) => {
        if (!text || !shown(mark)) return;
        const line = lineOf(text);
        if (!line) return;
        icons++;
        if (Math.max(line.lines, linesIn(container ?? null)) > 1) wrapped++;
        const r = mark.getBoundingClientRect();
        const off = r.top + r.height / 2 - line.capMid;
        offsets.push({ label, off: Math.round(off * 100) / 100 });
        if (Math.abs(off) > ICON_TOLERANCE) failures.push(`icon ${off.toFixed(2)}px off the cap height: ${label}`);
      };

      // IconText slots.
      for (const slot of document.querySelectorAll("[data-icon-text] > [data-icon-slot]")) {
        const body = slot.parentElement!.querySelector(":scope > [data-icon-text-body]");
        check(markOf(slot), firstText(body), describe(slot), body);
      }
      // Icons directly inside buttons and badges.
      for (const svg of document.querySelectorAll("[data-slot=button] > svg, [data-slot=badge] > svg")) {
        check(svg, firstText(svg.parentElement), describe(svg));
      }
      // Hanging icons, measured against the text element they hang from.
      for (const el of document.querySelectorAll(".icon-hang")) check(el, firstText(el.parentElement), describe(el));

      // Baseline rows: words that share a visual line share one baseline.
      for (const row of document.querySelectorAll("[class*='baseline-row']")) {
        const cs = getComputedStyle(row);
        if (!/flex/.test(cs.display) || cs.alignItems !== "baseline" || !shown(row)) continue;
        const items = [...row.childNodes]
          .filter((n) => (n.nodeType === 3 ? n.textContent!.trim() : n.nodeType === 1 && shown(n as Element)))
          .map((n) => (n.nodeType === 3 ? (n as Text) : firstText(n)))
          .filter((t): t is Text => !!t)
          .map((t) => ({ t, line: lineOf(t) }))
          .filter((i) => i.line);
        if (items.length < 2) continue;
        rows++;
        const lines: { baseline: number; text: string }[][] = [];
        for (const i of items.sort((a, b) => a.line!.baseline - b.line!.baseline)) {
          const entry = { baseline: i.line!.baseline, text: i.t.textContent!.trim().slice(0, 16) };
          const l = lines.find((l) => Math.abs(l[0].baseline - entry.baseline) < 8);
          if (l) l.push(entry);
          else lines.push([entry]);
        }
        for (const l of lines) {
          const spread = Math.max(...l.map((e) => e.baseline)) - Math.min(...l.map((e) => e.baseline));
          if (spread > BASELINE_TOLERANCE) failures.push(`baseline ${spread.toFixed(2)}px apart: ${describe(row)} [${l.map((e) => e.text).join(" | ")}]`);
        }
      }
      return { icons, rows, wrapped, failures: [...new Set(failures)], offsets };
    },
    { ICON_TOLERANCE, BASELINE_TOLERANCE },
  );
}

/** Load a page in a theme, reveal everything scroll reveals hold back, wait for fonts. */
async function open(page: Page, path: string, theme: (typeof THEMES)[number]) {
  await page.addInitScript((t) => {
    try {
      localStorage.setItem("ping-theme", t);
    } catch {}
  }, theme);
  const res = await page.goto(path, { waitUntil: "load" });
  expect(res?.status(), `${path} answered`).toBeLessThan(400);
  // Live sites can keep a connection open: wait for quiet, but never more than a few seconds.
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    scrollTo(0, 0);
    document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((e) => (e.dataset.revealed = ""));
    await new Promise((r) => setTimeout(r, 500));
  });
}

for (const size of SIZES) {
  test.describe(`${size.name}`, () => {
    test.use({ viewport: { width: size.width, height: size.height }, isMobile: size.isMobile, hasTouch: size.isMobile, deviceScaleFactor: size.deviceScaleFactor });
    for (const theme of THEMES) {
      for (const path of PAGES) {
        test(`${path} ${theme}`, async ({ page }) => {
          await open(page, path, theme);
          const r = await measure(page);
          console.log(`${path} ${size.name} ${theme}: ${r.icons} icons, ${r.rows} baseline rows, ${r.wrapped} wrapped`);
          // ALIGN_REPORT=1: every distinct pairing's worst offset, for comparing engines.
          if (process.env.ALIGN_REPORT) {
            const worst = new Map<string, number>();
            for (const { label, off } of r.offsets) {
              const key = (label.match(/"([^"]{0,30})/)?.[1] ?? label).trim() || label.slice(0, 30);
              if (Math.abs(off) > Math.abs(worst.get(key) ?? 0)) worst.set(key, off);
              else if (!worst.has(key)) worst.set(key, off);
            }
            console.log(`REPORT ${test.info().project.name} ${path} ${size.name} ${theme} ${JSON.stringify(Object.fromEntries(worst))}`);
          }
          expect(r.icons, "found icons to measure").toBeGreaterThan(0);
          expect(r.failures, r.failures.join("\n")).toEqual([]);
        });
      }

      // Engines without the cap unit (older iOS Safari): the same rule's fallback (--cap-half), forced here
      // by replacing the cap-unit declaration, must hold within the same tolerance.
      test(`no cap unit fallback ${theme}`, async ({ page }) => {
        await open(page, "/insights", theme);
        await page.addStyleTag({ content: ".icon-slot, .icon-hang { translate: 0 calc(50% - var(--cap-half, 0.355em)) !important; }" });
        await page.evaluate(() => {
          const note = document.querySelector<HTMLElement>("[data-note]");
          if (note) note.style.maxWidth = "12rem";
        });
        const r = await measure(page);
        expect(r.icons, "found icons to measure").toBeGreaterThan(0);
        expect(r.failures, r.failures.join("\n")).toEqual([]);
      });

      // Wrapping: the data note narrowed so its sentence runs over several lines; the icon stays on line one.
      test(`wrapped data note ${theme}`, async ({ page }) => {
        await open(page, "/", theme);
        await page.evaluate(() => {
          const note = document.querySelector<HTMLElement>("[data-note]");
          if (!note) throw new Error("data note not found");
          note.style.maxWidth = "12rem";
        });
        const r = await measure(page);
        expect(r.wrapped, "the data note wraps").toBeGreaterThan(0);
        expect(r.failures, r.failures.join("\n")).toEqual([]);
      });
    }
  });
}
