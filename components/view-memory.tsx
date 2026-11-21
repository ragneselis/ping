"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { viewToRestore } from "@/lib/view-memory";

/**
 * Mounted once on the Jobs page. On a client navigation to Jobs (the header tab, the wordmark) with a
 * plain URL, it restores the visitor's remembered view (lib/view-memory.ts). A full page load has
 * already restored before paint (VIEW_RESTORE_SCRIPT). Nothing is tracked: restoring is not a choice.
 */
export function RestoreView() {
  const router = useRouter();
  useEffect(() => {
    const qs = viewToRestore(window.location.search);
    if (qs) router.replace(`/?${qs}`, { scroll: false });
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
