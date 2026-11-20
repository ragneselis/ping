import type { Metadata } from "next";
import { Chakra_Petch, Fira_Code, Geist } from "next/font/google";
import type { ReactNode } from "react";
import { Band } from "@/components/blueprint";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const chakra = Chakra_Petch({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-chakra-petch" });
const fira = Fira_Code({ subsets: ["latin"], variable: "--font-fira-code" });
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: { default: "Jobs | Ping", template: "%s | Ping" },
  description: "Design jobs for EKA students, sorted into nine directions, plus what the market is actually asking for.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" className={`${chakra.variable} ${fira.variable} ${geist.variable}`} suppressHydrationWarning>
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
