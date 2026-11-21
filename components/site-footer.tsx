import { Coffee } from "lucide-react";
import Link from "next/link";
import { Band } from "@/components/blueprint";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Ko-fi page, the same "Buy me a coffee" link as in the Jon project (src/components/account-menu.tsx). */
const COFFEE_URL = "https://ko-fi.com/ragneselis";
const AUTHOR_URL = "https://ragne.me";

/**
 * Site footer. Left: who Ping is for. Right: the credit with a link, and a coffee link as an icon with a tooltip,
 * a 44px tap target on phones.
 */
export function SiteFooter() {
  return (
    <Band as="footer" last inner="flex flex-col gap-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div className="grid gap-1">
        <p>Ping is made for design students at the Estonian Academy of Arts.</p>
        {/* True since the GitHub Actions refresh runs every morning (.github/workflows/daily-refresh.yml). */}
        <p className="text-xs">
          Job listings refreshed daily.{" "}
          <Link href="/privacy" className="underline underline-offset-3 hover:text-foreground">
            Privacy
          </Link>
        </p>
      </div>
      <div className="flex items-center gap-1">
        <p>
          Built and maintained by{" "}
          <a
            href={AUTHOR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline decoration-hairline-strong underline-offset-4 transition-colors hover:text-brand-sm hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Ragne Selis
          </a>
        </p>
        <Tooltip>
          <TooltipTrigger
            render={
              <a
                href={COFFEE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Buy me a coffee (opens in a new tab)"
                className="flex size-11 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-brand-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:size-8"
              />
            }
          >
            <Coffee aria-hidden className="size-4" strokeWidth={1.75} />
          </TooltipTrigger>
          <TooltipContent>Buy me a coffee</TooltipContent>
        </Tooltip>
      </div>
    </Band>
  );
}
