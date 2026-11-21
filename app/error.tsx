"use client";

import { RotateCcw } from "lucide-react";
import { Band } from "@/components/blueprint";
import { Button } from "@/components/ui/button";

/** When a page fails to render. Same layout as the subscription pages; Try again re-renders it. */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Band aria-labelledby="error-heading" inner="grid gap-5 py-16 sm:py-24">
      <h1 id="error-heading">Ping tripped over something</h1>
      <p className="max-w-prose text-lg leading-relaxed text-pretty text-muted-foreground">
        This page could not load. Try again, or come back in a minute.
      </p>
      <div className="pt-2">
        <Button onClick={reset}>
          <RotateCcw data-icon="inline-start" />
          Try again
        </Button>
      </div>
    </Band>
  );
}
