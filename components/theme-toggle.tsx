"use client";

import { Menu } from "@base-ui/react/menu";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState, useSyncExternalStore } from "react";
import { DiscordIcon, SlackIcon } from "@/components/brand-icons";
import { openSubscribe } from "@/components/subscribe-dialog";
import { ICON_BUTTON, ICON_SIZE } from "@/components/icon-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { OWN_CLICK_SOUND, sound } from "@/lib/sound";
import { IconText } from "@/components/icon-text";

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

/** Phones (below Tailwind's sm): the header has no room for the Slack and Discord buttons. */
const PHONE = "(max-width: 39.999rem)";
const subscribePhone = (cb: () => void) => {
  const mq = window.matchMedia(PHONE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const usePhone = () => useSyncExternalStore(subscribePhone, () => window.matchMedia(PHONE).matches, () => false);

const SOON = [
  { name: "Slack", icon: SlackIcon },
  { name: "Discord", icon: DiscordIcon },
] as const;

const prefersDark = () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;

/**
 * One theme button for every screen size. It shows the current choice (Sun, Moon or Monitor) and
 * opens a small menu of Light, Dark and System with the current one marked. Base UI's Menu gives it
 * the keyboard model: arrows move, Enter or Space choose, Escape or a click outside close.
 * Choosing applies at once and closes the menu. On phones the menu also holds the Slack and Discord
 * "coming soon" entries, which sit in the header itself from sm up; each opens the "Get new jobs" modal. Theming itself is unchanged (next-themes: light on a
 * first visit, stored choice applied before paint, System follows the OS live).
 */
export function ThemeMenu() {
  const { choice, setTheme } = useChoice();
  const { resolvedTheme } = useTheme();
  const current = OPTIONS.find((o) => o.value === choice) ?? OPTIONS[0];
  const Current = current.icon;
  const phone = usePhone();

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
              {...OWN_CLICK_SOUND}
              className={ICON_BUTTON}
            />
          }
        >
          <Current aria-hidden className={ICON_SIZE.lucide} strokeWidth={1.75} />
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
                  {...OWN_CLICK_SOUND}
                  className="flex min-h-11 items-center px-3 font-medium outline-none select-none data-highlighted:bg-brand-tint sm:min-h-9"
                >
                  <IconText
                    className="flex-1 gap-3"
                    textClassName="flex-1"
                    icon={<o.icon className="size-4" strokeWidth={1.75} />}
                    iconEnd={
                      <Menu.RadioItemIndicator>
                        <Check className="size-4 text-brand-sm" strokeWidth={2} />
                      </Menu.RadioItemIndicator>
                    }
                  >
                    {o.label}
                  </IconText>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
            {phone && (
              <>
                <Menu.Separator className="my-1 h-px bg-hairline" />
                <Menu.Group>
                  <Menu.GroupLabel className="px-3 pt-2 pb-1 label-mono text-muted-foreground">Coming soon</Menu.GroupLabel>
                  {SOON.map((c) => (
                    <Menu.Item
                      key={c.name}
                      label={c.name}
                      {...OWN_CLICK_SOUND}
                      onClick={() => openSubscribe("channels")}
                      className="flex min-h-11 items-center px-3 font-medium outline-none select-none data-highlighted:bg-brand-tint"
                    >
                      <IconText className="flex-1 gap-3" icon={<c.icon className="size-4" />}>
                        {c.name}
                        <span className="sr-only">: coming soon</span>
                      </IconText>
                    </Menu.Item>
                  ))}
                </Menu.Group>
              </>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
