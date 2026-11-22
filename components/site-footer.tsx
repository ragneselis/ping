import { Coffee } from "lucide-react";
import Link from "next/link";
import { GithubIcon } from "@/components/brand-icons";
import { Band } from "@/components/blueprint";
import { ButtonIcon, ICON_SIZE, IconLink } from "@/components/icon-button";

/** Ko-fi page, the same "Buy me a coffee" link as in the Jon project (src/components/account-menu.tsx). */
const COFFEE_URL = "https://ko-fi.com/ragneselis";
const AUTHOR_URL = "https://ragne.me";
const REPO_URL = "https://github.com/ragneselis/ping";
const EKA_URL = "https://www.artun.ee/en/";

const TEXT_LINK =
  "font-medium text-foreground underline decoration-hairline-strong underline-offset-4 transition-colors hover:text-brand-sm hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/**
 * Site footer, one text size throughout. Desktop: three columns on one line (who Ping is for with the
 * Privacy link, the coffee and GitHub icon buttons centred as a pair, the credit). Phones: the same
 * three stacked in that order. The icon buttons are the header's (components/icon-button.tsx).
 */
export function SiteFooter() {
  return (
    <Band
      as="footer"
      last
      inner="grid gap-4 py-6 text-sm text-muted-foreground md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:gap-8"
    >
      <p>
        Ping scouts design jobs for students at the{" "}
        <a href={EKA_URL} target="_blank" rel="noopener noreferrer" className={TEXT_LINK}>
          Estonian Academy of Arts
        </a>
        .{" "}
        <Link href="/privacy" className={TEXT_LINK}>
          Privacy
        </Link>
      </p>
      <div className="flex items-center gap-2">
        <IconLink href={COFFEE_URL} label="Buy me a coffee (opens in a new tab)" tooltip="Buy me a coffee">
          <ButtonIcon icon={Coffee} className={ICON_SIZE.lucide} strokeWidth={1.75} />
        </IconLink>
        <IconLink href={REPO_URL} label="Source code on GitHub (opens in a new tab)" tooltip="Source code on GitHub">
          <GithubIcon className={ICON_SIZE.glyph} />
        </IconLink>
      </div>
      <p className="md:text-right">
        Built and maintained by{" "}
        <a href={AUTHOR_URL} target="_blank" rel="noopener noreferrer" className={TEXT_LINK}>
          Ragne
        </a>
      </p>
    </Band>
  );
}
