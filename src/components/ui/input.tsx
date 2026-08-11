import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * A recessed slot, not a floating box: --well fill, an inset shadow, and a 1px
 * --input edge (3.5:1, so it satisfies SC 1.4.11 as a real control boundary).
 * Focus is the site-wide 1px lobster edge plus a 3px lobster wash — never the
 * shadcn ring-offset glow.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-[3px] border border-input bg-[color:var(--well)] px-3 py-2 text-[14px] text-foreground shadow-[inset_0_1px_2px_oklch(0_0_0/55%)] outline-none transition-[border-color,box-shadow] duration-[120ms]",
        "placeholder:text-muted-foreground/70 selection:bg-primary selection:text-primary-foreground",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "disabled:cursor-not-allowed disabled:opacity-45",
        "focus-visible:border-lobster focus-visible:shadow-[inset_0_1px_2px_oklch(0_0_0/55%),0_0_0_3px_oklch(0.70_0.19_34/18%)]",
        "aria-invalid:border-destructive aria-invalid:focus-visible:shadow-[inset_0_1px_2px_oklch(0_0_0/55%),0_0_0_3px_oklch(0.66_0.20_25/22%)]",
        className
      )}
      {...props}
    />
  )
}

/** The same slot, sized for prose. Used by the launcher and mission dispatch. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "w-full resize-y rounded-[3px] border border-input bg-[color:var(--well)] px-4 py-3 text-[15px] leading-relaxed text-foreground shadow-[inset_0_1px_2px_oklch(0_0_0/55%)] outline-none transition-[border-color,box-shadow] duration-[120ms]",
        "placeholder:text-muted-foreground/70",
        "disabled:cursor-not-allowed disabled:opacity-45",
        "focus-visible:border-lobster focus-visible:shadow-[inset_0_1px_2px_oklch(0_0_0/55%),0_0_0_3px_oklch(0.70_0.19_34/18%)]",
        className
      )}
      {...props}
    />
  )
}

export { Input, Textarea }
