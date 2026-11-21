import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The one way to put an icon, dot or small glyph next to text (the rule in app/globals.css, "Icon next
 * to text"). The icon is centred on the cap height of the text's FIRST line, for one line or wrapped
 * text, at any size in the type scale: the slot's offset is computed from the text's own line height,
 * cap height and font metrics, never a pixel nudge.
 *
 * - Put the text style (size, line height, font) on IconText itself (className): the icon measures
 *   against it.
 * - `icon` sits before the text, `iconEnd` after it (an arrow, a check). Both are decorative
 *   (aria-hidden) unless `iconsHidden={false}` (a real checkbox in the slot); give the text the meaning.
 * - It aligns its text on the baseline, so inside a baseline-row it lines up like plain text.
 * - In a box taller than one line (a 44px touch row), add "flex-wrap content-center" to centre the line.
 * - Never place an icon next to text without it (docs/DEVELOPMENT.md, Alignment); npm run check:align
 *   fails when an icon drifts more than 0.75px off its first line's cap height.
 */
export function IconText<T extends ElementType = "span">({
  as,
  icon,
  iconEnd,
  children,
  className,
  textClassName,
  inline = false,
  iconsHidden = true,
  ...rest
}: {
  as?: T;
  icon?: ReactNode;
  iconEnd?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Classes for the text wrapper, e.g. flex-1 to push `iconEnd` to the far end. */
  textClassName?: string;
  /** inline-flex instead of flex, for use inside running text. */
  inline?: boolean;
  /** The slots are aria-hidden unless false (a slot holding a real control). */
  iconsHidden?: boolean;
} & Omit<ComponentPropsWithoutRef<T>, "children" | "className">) {
  const Tag: ElementType = as ?? "span";
  const slot = (node: ReactNode) => (
    <span aria-hidden={iconsHidden || undefined} data-icon-slot="" className="icon-slot flex">
      {node}
    </span>
  );
  return (
    <Tag data-icon-text="" className={cn(inline ? "icon-text-inline" : "icon-text", "gap-2", className)} {...rest}>
      {icon && slot(icon)}
      <span data-icon-text-body="" className={cn("min-w-0", textClassName)}>
        {children}
      </span>
      {iconEnd && slot(iconEnd)}
    </Tag>
  );
}
