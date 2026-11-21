import type * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/*
 * Baseline: the label is what a button offers to a baseline-row (globals.css), even when an icon comes
 * first. The label aligns on the baseline; icons are icon slots (the icon rule in globals.css), centred
 * on the label's capitals and never lending the button their bottom edge as a baseline. The single line
 * is centred in the button's height (flex-wrap plus content-center; buttons are shrink-0 and nowrap, so
 * nothing actually wraps).
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 flex-wrap content-center items-baseline justify-center [&>svg]:icon-slot rounded-lg border border-transparent bg-clip-padding font-mono text-[12px] font-medium tracking-[0.12em] whitespace-nowrap uppercase transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /* GrönLoop system: square, mono uppercase labels. Primary is the emerald fill (--brand-sm, white label 5.48:1). */
        default: "bg-primary text-primary-foreground hover:bg-brand-sm-hover",
        outline:
          "border-hairline-strong bg-transparent text-foreground hover:border-brand-lg hover:bg-brand-tint aria-expanded:bg-brand-tint",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "bg-transparent text-foreground hover:text-brand-sm aria-expanded:text-brand-sm",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-brand-sm underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-2 px-3.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-[min(var(--radius-md),12px)] px-3 text-[11px] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 px-6 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
      /*
       * Icon-only below a breakpoint: the label (wrap it in <ButtonLabel>) is visually hidden and the
       * button becomes the header icon buttons' square (components/icon-button.tsx): 44px, no padding
       * (including the inline-start/end padding the sizes add), the icon at 20px, centred on both axes.
       */
      iconOnlyBelow: {
        none: "",
        sm: "max-sm:size-11 max-sm:gap-0 max-sm:p-0 max-sm:has-data-[icon=inline-start]:pl-0 max-sm:has-data-[icon=inline-end]:pr-0 max-sm:[&_svg]:size-5! max-sm:[&_[data-slot=button-label]]:sr-only",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      iconOnlyBelow: "none",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  iconOnlyBelow = "none",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, iconOnlyBelow, className }))}
      {...props}
    />
  )
}

/** A button's text label; hidden visually (kept for screen readers) where the button is icon-only. */
function ButtonLabel(props: React.ComponentProps<"span">) {
  return <span data-slot="button-label" {...props} />
}

export { Button, ButtonLabel, buttonVariants }
