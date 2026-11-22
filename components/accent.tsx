import type React from "react";
import { cn } from "@/lib/utils";

/**
 * The green words in a headline: each page's h1 and the closing line, nowhere else. Colours its text
 * with --heading-accent, which is the readout numbers' green (--brand-lg: 3.77:1 on white, 9.69:1 on
 * the dark background) and, on the deep emerald closing band, --brand-on-band (5.06:1). Both pass AA
 * for large text; headings are bold and at least 24px.
 */
export function Accent({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("text-heading-accent", className)} {...props} />;
}
