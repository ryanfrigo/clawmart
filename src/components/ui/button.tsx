import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * A machined button.
 *
 * `default` is lobster and physically depresses: :active drops the bottom
 * bevel and translates 1px, which sells "this is a control on a plate" harder
 * than any texture. Lobster is heat — at most ONE default button per region.
 * Everything else is a hairline ghost.
 *
 * No lift, no scale, no shadow ramp: elevation in this system is a 1px bevel.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[3px] text-[13.5px] font-semibold outline-none transition-[background-color,border-color,color,box-shadow,transform] duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)] disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/22%),0_1px_0_var(--edge-dark)] hover:bg-primary/92 active:translate-y-px active:shadow-[inset_0_1px_0_oklch(1_0_0/22%)]",
        destructive:
          "bg-destructive text-white shadow-[inset_0_1px_0_oklch(1_0_0/18%),0_1px_0_var(--edge-dark)] hover:bg-destructive/90 active:translate-y-px active:shadow-[inset_0_1px_0_oklch(1_0_0/18%)]",
        outline:
          "border border-[color:var(--rule)] bg-transparent text-foreground hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
        ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 has-[>svg]:px-3.5",
        xs: "h-6 gap-1 px-2 text-[12px] has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3 text-[13px] has-[>svg]:px-2.5",
        lg: "h-11 px-6 text-[14px] has-[>svg]:px-5",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
