import type { ComponentProps, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Blueprint frame. Every page is a stack of bands:
 * - each band is full viewport width with a 1px --frame-line rule underneath (the horizontal bands),
 * - inside it, the content column runs the full width minus the --gutter token (16px phones, 32px tablets,
 *   48px from 1024px, 64px from 1920px). It has 1px --frame-line sides (the vertical frame) and an opaque
 *   --background, so the body's diagonal hatching only shows in the gutters.
 * No max width: Ping is a dashboard. Text blocks cap themselves at max-w-prose instead.
 * Columns of consecutive bands line up, so the vertical lines run the full page height.
 */
export const FRAME_COLUMN = "mx-(--gutter) border-x border-frame-line bg-background px-4 md:px-6 lg:px-8";

export function Band<T extends ElementType = "section">({
  as,
  children,
  className,
  inner,
  last = false,
  ...rest
}: {
  as?: T;
  children: ReactNode;
  className?: string;
  /** Classes for the content column (padding, grid gaps). */
  inner?: string;
  /** The last band on the page has no rule underneath. */
  last?: boolean;
} & Omit<ComponentProps<T>, "as" | "children" | "className">) {
  const Tag = (as ?? "section") as ElementType;
  return (
    <Tag className={cn(!last && "border-b border-frame-line", className)} {...rest}>
      <div className={cn(FRAME_COLUMN, inner)}>{children}</div>
    </Tag>
  );
}
