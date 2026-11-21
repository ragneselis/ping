import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { Band } from "@/components/blueprint";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ariataDisplay, ariataText } from "./fonts";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: { default: "Jobs | Ping", template: "%s | Ping" },
  description: "Design jobs for EKA students, sorted into nine directions, plus what the market is actually asking for.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" className={`${ariataDisplay.variable} ${ariataText.variable} ${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <ThemeProvider>
          <TooltipProvider>
            <SiteHeader />
            <main>{children}</main>
            <Band as="footer" last inner="flex flex-col gap-1 py-6 text-sm text-muted-foreground sm:flex-row sm:justify-between">
              <span>Ping is made for design students at the Estonian Academy of Arts.</span>
              <span>Every job links to the original posting. Apply there.</span>
            </Band>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
