"use client";

import { BellRing, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SubscribeDialog } from "@/components/subscribe-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Jobs" },
  { href: "/insights", label: "Market insights" },
];

export function Wordmark() {
  return (
    <Link href="/" className="group flex items-center gap-2 text-xl font-bold tracking-tight" aria-label="Ping home">
      <span className="relative flex size-3">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
        <span className="relative inline-flex size-3 rounded-full bg-primary" />
      </span>
      Ping
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:gap-6">
        <Wordmark />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
                active(n.href) ? "text-foreground" : "text-muted-foreground",
              )}
              aria-current={active(n.href) ? "page" : undefined}
            >
              {n.label}
              {active(n.href) && <span className="mt-0.5 block h-0.5 rounded-full bg-primary" />}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <SubscribeDialog
            trigger={
              <Button size="sm" className="mr-1">
                <BellRing data-icon="inline-start" />
                Get new jobs
              </Button>
            }
          />
          <ThemeToggle />
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" />}>
              <Menu />
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="grid gap-1 px-4" aria-label="Mobile">
                {NAV.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={active(n.href) ? "page" : undefined}
                    className={cn("rounded-md px-3 py-2 text-base font-medium hover:bg-muted", active(n.href) ? "bg-muted" : "")}
                  >
                    {n.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
