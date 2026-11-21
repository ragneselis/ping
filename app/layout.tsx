import type { Metadata } from "next";
import { Geist, Geist_Mono, Martian_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { ClosingBand } from "@/components/closing-band";
import { RevealObserver } from "@/components/reveal";
import { SoundEffects } from "@/components/sound";
import { SiteHeader } from "@/components/site-header";
import { TabPresence } from "@/components/tab-presence";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SHARE_DESCRIPTION, shareMetadata } from "@/lib/share";
import "./globals.css";

// Display face: variable weight plus the width axis, so headings can run condensed (see globals.css).
const martian = Martian_Mono({ subsets: ["latin", "latin-ext"], weight: "variable", axes: ["wdth"], variable: "--font-martian" });
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  metadataBase: new URL("https://ping.ragne.me"),
  // Pages are "Page name | Ping"; the Jobs page sets its own ("Ping | Design jobs").
  title: { default: "Ping", template: "%s | Ping" },
  description: SHARE_DESCRIPTION,
  ...shareMetadata("Ping"),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" className={`${martian.variable} ${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <ThemeProvider>
          <TooltipProvider>
            <SoundEffects />
            <RevealObserver />
            <TabPresence />
            <SiteHeader />
            <main>{children}</main>
            <ClosingBand />
            <SiteFooter />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
