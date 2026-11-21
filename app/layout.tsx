import type { Metadata } from "next";
import { Geist, Geist_Mono, Martian_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { ClosingBand } from "@/components/closing-band";
import { RevealObserver } from "@/components/reveal";
import { SoundEffects } from "@/components/sound";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// Display face: variable weight plus the width axis, so headings can run condensed (see globals.css).
const martian = Martian_Mono({ subsets: ["latin", "latin-ext"], weight: "variable", axes: ["wdth"], variable: "--font-martian" });
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

/** One share text for every page, so a shared link always looks the same. */
const SHARE_DESCRIPTION = "Design jobs for EKA students, updated daily.";

export const metadata: Metadata = {
  metadataBase: new URL("https://ping.ragne.me"),
  // The Jobs page is just "Ping"; other pages are "Page name | Ping".
  title: { default: "Ping", template: "%s | Ping" },
  description: SHARE_DESCRIPTION,
  // The share image comes from app/opengraph-image.tsx and app/twitter-image.tsx.
  openGraph: { title: "Ping", description: SHARE_DESCRIPTION, siteName: "Ping", type: "website", locale: "en_GB" },
  twitter: { card: "summary_large_image", title: "Ping", description: SHARE_DESCRIPTION },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" className={`${martian.variable} ${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <ThemeProvider>
          <TooltipProvider>
            <SoundEffects />
            <RevealObserver />
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
