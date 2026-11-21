"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isSoundOn, setSoundOn, sound, subscribeSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

/** Elements that "ping" on click: buttons, tabs, filters, segmented controls, expanders, menu items. */
const CLICKABLE = 'button, summary, [role="tab"], [role="radio"], [role="menuitem"], [role="menuitemradio"], [aria-label="Direction"] a, [data-sound="click"]';
/** Elements that tick on mouse hover. */
const HOVERABLE = 'a[href], button, summary, [role="menuitem"], [role="menuitemradio"], input, [data-sound="chirp"]';

const labelOf = (el: Element) => el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 40) ?? "";

/**
 * Wires UI sound once for the whole page with two document-level listeners, so every shared
 * control gets it without its own code. Elements with their own sound (menu and dialog triggers,
 * theme options) opt out with data-sound="none"; mascots chirp with data-sound="chirp".
 * Every sound call is gated inside lib/sound.ts: with sound off, nothing is created or played.
 */
export function SoundEffects() {
  useEffect(() => {
    let lastHovered: Element | null = null;
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest(CLICKABLE);
      if (!el || el.closest('[data-sound="none"]') || (el as HTMLButtonElement).disabled) return;
      sound.click(labelOf(el));
    };
    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const el = (e.target as Element | null)?.closest(HOVERABLE) ?? null;
      if (el === lastHovered) return;
      lastHovered = el;
      if (!el || (el as HTMLButtonElement).disabled) return;
      if (el.getAttribute("data-sound") === "chirp") sound.chirp();
      else sound.hover(labelOf(el));
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("pointerover", onOver, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointerover", onOver, true);
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
