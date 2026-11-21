import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Band } from "@/components/blueprint";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Not found", robots: { index: false } };

/** Any address Ping does not know (and /subscription/<unknown>). Same layout as the subscription pages. */
export default function NotFound() {
  return (
    <Band aria-labelledby="not-found-heading" inner="grid gap-5 py-16 sm:py-24">
      <h1 id="not-found-heading">Ping looked everywhere</h1>
      <p className="max-w-prose text-lg leading-relaxed text-pretty text-muted-foreground">
        This page isn&rsquo;t here. The link may be old, or the address may have a typo.
      </p>
      <div className="pt-2">
        <Button nativeButton={false} render={<Link href="/" />}>
          See the jobs
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </Band>
  );
}
