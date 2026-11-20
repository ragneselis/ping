"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/** Storage key for the visitor's choice: "light", "dark" or "system". */
export const THEME_STORAGE_KEY = "ping-theme";

/**
 * Light by default on a first visit. "System" applies only when the visitor picks it and then
 * follows prefers-color-scheme live. next-themes injects a blocking script that applies the stored
 * choice to <html> before the first paint, so there is no flash of the other theme.
 */
export function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      themes={["light", "dark"]}
      storageKey={THEME_STORAGE_KEY}
      disableTransitionOnChange
      {...props}
    />
  );
}
