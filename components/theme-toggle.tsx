"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

/** The stored choice, or null until mounted (the server cannot know it, so nothing is marked active yet). */
function useChoice() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return { choice: mounted ? (theme ?? "light") : null, setTheme };
}

/** Light / Dark / System as a segmented control (radio group) with tooltips. Used from sm up. */
export function ThemeSwitch({ className }: { className?: string }) {
  const { choice, setTheme } = useChoice();
  return (
    <div role="radiogroup" aria-label="Colour theme" className={cn("flex items-center border border-hairline-strong", className)}>
      {OPTIONS.map((o) => {
        const active = choice === o.value;
        return (
          <Tooltip key={o.value}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`${o.label} theme`}
                  onClick={() => setTheme(o.value)}
                  className={cn(
                    "flex size-8 items-center justify-center border-l border-hairline-strong text-muted-foreground transition-colors first:border-l-0 hover:text-foreground focus-visible:relative focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                    active && "bg-primary text-primary-foreground hover:text-primary-foreground",
                  )}
                />
              }
            >
              <o.icon aria-hidden className="size-4" strokeWidth={1.75} />
            </TooltipTrigger>
            <TooltipContent>{o.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

/** Phones: one 44px button showing the current choice, opening the same three options with labels. */
export function ThemeMenu() {
  const { choice, setTheme } = useChoice();
  const { resolvedTheme } = useTheme();
  // Until mounted the server cannot know the stored choice: show the default (Sun) so the
  // server and client render the same icon, then switch to the real one.
  const Current = choice === null ? Sun : choice === "system" ? Monitor : resolvedTheme === "dark" ? Moon : Sun;
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Colour theme"
            className="flex size-11 items-center justify-center border border-hairline-strong text-foreground transition-colors hover:border-brand-lg hover:bg-brand-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        }
      >
        <Current aria-hidden className="size-5" strokeWidth={1.75} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        <div role="radiogroup" aria-label="Colour theme" className="grid">
          {OPTIONS.map((o) => {
            const active = choice === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(o.value)}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-sm px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  active && "bg-primary text-primary-foreground hover:bg-primary",
                )}
              >
                <o.icon aria-hidden className="size-4" strokeWidth={1.75} />
                {o.label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
