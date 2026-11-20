import type { ComponentProps, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Blueprint frame. Every page is a stack of bands:
 * - each band is full viewport width with a 1px --frame-line rule underneath (the horizontal bands),
 * - inside it, the content column (max-w-6xl) has 1px --frame-line sides (the vertical frame) and an
 *   opaque --background, so the body's diagonal hatching only shows in the gutters outside the frame.
 * Columns of consecutive bands line up, so the vertical lines run the full page height.
 * On phones the column fills the width: the bands stay, the side lines and gutters drop away.
 */
export const FRAME_COLUMN = "mx-auto w-full max-w-6xl bg-background px-4 sm:px-6 md:border-x md:border-frame-line";

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
