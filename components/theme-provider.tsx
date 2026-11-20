"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Dark first. Only "dark" and "light" exist (no "system"), stored under Ping's own key,
 * so a leftover "system" value from an older version cannot override the dark default.
 */
export function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      themes={["dark", "light"]}
      storageKey="ping-theme"
      disableTransitionOnChange
      {...props}
    />
  );
}
