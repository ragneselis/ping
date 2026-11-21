"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isSoundOn, setSoundOn, sound, subscribeSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

/*
 * One delegated sound layer for the whole interface. A handful of document-level listeners give every
 * interactive element its sound, including elements added later (filter results, "Load more", menus).
 *
 *   click or tap   any link, button, tab, segmented or sort option, menu item, expander summary,
 *                  job row (its link), panel link, or chart bar       -> the click ping
 *   hover (mouse)  buttons, tabs, filters, segmented and sort options, links, panels -> the hover tick
 *   job rows       a softer tick only when the pointer reaches a new row, at most every 80ms
 *   chart bars     a hover tick whose pitch rises with the bar's value
 *   search         no sound per keystroke; the results update plays a quiet tick (components/results-fade.tsx)
 *
 * Opt out with data-sound="none" on an element or any ancestor (elements with their own sound: the
 * theme menu, the "Get new jobs" dialog trigger, the sound toggle, expander summaries, the snake board).
 * Expanders, dialogs and menus play open and close; mascots chirp; the snake pings when it eats.
 * Every call is gated in lib/sound.ts: with sound off nothing is created or played, and nothing plays on load.
 */

const CLICKABLE =
  'a[href], button, summary, [role="tab"], [role="radio"], [role="menuitem"], [role="menuitemradio"], [role="option"], [data-sound="click"], .recharts-bar-rectangle';
const HOVERABLE =
  'a[href], button, summary, [role="tab"], [role="radio"], [role="menuitem"], [role="menuitemradio"], [role="option"], input, select, [data-panel]';
const BAR = ".recharts-bar-rectangle";

const optedOut = (el: Element) => !!el.closest('[data-sound="none"]');
const labelOf = (el: Element) => el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 40) ?? "";

/** A chart bar's value as a share of the largest bar in the same chart, from its drawn size. */
function barShare(bar: Element): number {
  const chart = bar.closest("[data-bars]");
  const vertical = chart?.getAttribute("data-bars") === "y";
  const size = (el: Element) => {
    const path = el.querySelector("path");
    if (!path) return 0;
    const b = (path as SVGGraphicsElement).getBBox();
    return vertical ? b.height : b.width;
  };
  const all = chart ? [...chart.querySelectorAll(BAR)].map(size) : [];
  const max = Math.max(1, ...all);
  return size(bar) / max;
}

export function SoundEffects() {
  useEffect(() => {
    let lastHovered: Element | null = null;
    let lastRow: Element | null = null;

    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest(CLICKABLE);
      if (!el || optedOut(el) || (el as HTMLButtonElement).disabled) return;
      sound.click(labelOf(el));
    };

    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const target = e.target as Element | null;
      if (!target || optedOut(target)) return;

      // Job rows: one soft tick per new row, whatever inside the row the pointer is on.
      const row = target.closest("[data-row]");
      if (row) {
        if (row !== lastRow) {
          lastRow = row;
          lastHovered = row;
          sound.row(labelOf(row.querySelector("h3") ?? row));
        }
        return;
      }
      lastRow = null;

      // Chart bars: pitch follows the value.
      const bar = target.closest(BAR);
      if (bar) {
        if (bar !== lastHovered) {
          lastHovered = bar;
          sound.bar(barShare(bar));
        }
        return;
      }

      const el = target.closest(HOVERABLE);
      if (el === lastHovered) return;
      lastHovered = el;
      if (!el || (el as HTMLButtonElement).disabled) return;
      sound.hover(labelOf(el));
    };

    // Any real gesture starts audio (silently, only while sound is on), so passive sounds such as the
    // search results tick can follow even if the first thing someone does is type.
    const onGesture = () => sound.unlock();

    // Expanders (<details>, e.g. "+N similar") play the open and close sounds. "toggle" does not
    // bubble, so it is caught in the capture phase.
    const onToggle = (e: Event) => {
      const d = e.target;
      if (d instanceof HTMLDetailsElement && d.hasAttribute("data-expander")) (d.open ? sound.open() : sound.close());
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("pointerover", onOver, true);
    document.addEventListener("pointerdown", onGesture, true);
    document.addEventListener("keydown", onGesture, true);
    document.addEventListener("toggle", onToggle, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointerover", onOver, true);
      document.removeEventListener("pointerdown", onGesture, true);
      document.removeEventListener("keydown", onGesture, true);
      document.removeEventListener("toggle", onToggle, true);
    };
  }, []);
  return null;
}

/** Sound on or off: one header button, remembered in localStorage. Off by default. */
export function SoundToggle({ className }: { className?: string }) {
  // Server and first client render say "off" (nothing stored can be read there); the stored choice follows.
  const on = useSyncExternalStore(subscribeSound, isSoundOn, () => false);
  const label = on ? "Turn sound off" : "Turn sound on";
  const Icon = on ? Volume2 : VolumeX;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            aria-pressed={on}
            data-sound="none"
            onClick={() => {
              setSoundOn(!on);
              // Turning sound on confirms itself with one ping; turning it off stays silent.
              if (!on) sound.click("sound");
            }}
            className={cn(HEADER_ICON_BUTTON, className)}
          />
        }
      >
        <Icon aria-hidden className="size-5 sm:size-4" strokeWidth={1.75} />
      </TooltipTrigger>
      <TooltipContent>{on ? "Sound on" : "Sound off"}</TooltipContent>
    </Tooltip>
  );
}

/** The header's square icon buttons (sound, theme): hairline border, 44px on phones, 32px from sm. */
export const HEADER_ICON_BUTTON =
  "flex size-11 shrink-0 items-center justify-center border border-hairline-strong text-foreground transition-colors hover:border-brand-lg hover:bg-brand-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-expanded:border-brand-lg aria-expanded:bg-brand-tint sm:size-8";
