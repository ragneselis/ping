import type { Metadata } from "next";

/**
 * Share text: one description for every page, so a shared link always reads the same. The Jobs
 * page shares under a longer title; other pages share as "Ping". The share image comes from
 * app/opengraph-image.tsx and app/twitter-image.tsx.
 */
export const SHARE_DESCRIPTION = "Every morning Ping brings back new design jobs, sorted by direction and level.";

/** openGraph and twitter metadata with this share title (pages replace these objects whole, so build them here). */
export function shareMetadata(title: string): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: { title, description: SHARE_DESCRIPTION, siteName: "Ping", type: "website", locale: "en_GB" },
    twitter: { card: "summary_large_image", title, description: SHARE_DESCRIPTION },
  };
}
