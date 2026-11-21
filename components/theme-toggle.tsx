"use client";

import { Menu } from "@base-ui/react/menu";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { HEADER_ICON_BUTTON } from "@/components/sound";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { sound } from "@/lib/sound";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

/** The stored choice, or null until mounted (the server cannot know it, so the default icon shows first). */
function useChoice() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return { choice: mounted ? (theme ?? "light") : null, setTheme };
}

const prefersDark = () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;

/**
 * One theme button for every screen size. It shows the current choice (Sun, Moon or Monitor) and
 * opens a small menu of Light, Dark and System with the current one marked. Base UI's Menu gives it
 * the keyboard model: arrows move, Enter or Space choose, Escape or a click outside close.
 * Choosing applies at once and closes the menu. Theming itself is unchanged (next-themes: light on a
 * first visit, stored choice applied before paint, System follows the OS live).
 */
export function ThemeMenu() {
  const { choice, setTheme } = useChoice();
  const { resolvedTheme } = useTheme();
  const current = OPTIONS.find((o) => o.value === choice) ?? OPTIONS[0];
  const Current = current.icon;

  return (
    <Menu.Root
      onOpenChange={(open) => {
        if (open) sound.open();
        else sound.close();
      }}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <Menu.Trigger
              aria-label={`Colour theme: ${choice === null ? "Light" : current.label}`}
              data-sound="none"
              className={HEADER_ICON_BUTTON}
            />
          }
        >
          <Current aria-hidden className="size-5 sm:size-4" strokeWidth={1.75} />
        </TooltipTrigger>
        <TooltipContent>Colour theme</TooltipContent>
      </Tooltip>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-50 outline-none">
          <Menu.Popup className="w-44 origin-(--transform-origin) border border-border bg-popover p-1 text-sm text-popover-foreground outline-none data-ending-style:opacity-0 data-starting-style:opacity-0 motion-safe:transition-opacity motion-safe:duration-100">
            <Menu.RadioGroup
              value={choice ?? "light"}
              onValueChange={(value: string) => {
                const toDark = value === "dark" || (value === "system" ? prefersDark() : false);
                const wasDark = resolvedTheme === "dark";
                setTheme(value);
                if (toDark !== wasDark) sound.theme(toDark);
                else sound.click(value);
              }}
            >
              {OPTIONS.map((o) => (
                <Menu.RadioItem
                  key={o.value}
                  value={o.value}
                  closeOnClick
                  data-sound="none"
                  className="flex min-h-11 cursor-default items-center gap-3 px-3 font-medium outline-none select-none data-highlighted:bg-brand-tint sm:min-h-9"
                >
                  <o.icon aria-hidden className="size-4" strokeWidth={1.75} />
                  <span className="flex-1">{o.label}</span>
                  <Menu.RadioItemIndicator>
                    <Check aria-hidden className="size-4 text-brand-sm" strokeWidth={2} />
                  </Menu.RadioItemIndicator>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
