import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary/90 text-primary-foreground border-primary/20 liquid-glass shadow-sm hover:bg-primary",
        outline:
          "border-white/40 bg-white/30 liquid-glass shadow-sm hover:bg-white/50 hover:text-foreground aria-expanded:bg-white/50 aria-expanded:text-foreground dark:border-white/10 dark:bg-black/30 dark:hover:bg-black/50",
        secondary:
          "bg-secondary/50 text-secondary-foreground border-white/20 liquid-glass shadow-sm hover:bg-secondary/70 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "border-transparent hover:bg-white/40 hover:text-foreground aria-expanded:bg-white/40 aria-expanded:text-foreground dark:hover:bg-black/40",
        destructive:
          "bg-destructive/80 text-destructive-foreground border-destructive/20 liquid-glass shadow-sm hover:bg-destructive focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/80 dark:hover:bg-destructive dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline shadow-none bg-transparent border-transparent",
      },
      size: {
        default:
          "min-h-[44px] sm:min-h-[40px] h-auto gap-2 px-4 py-2 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "h-7 gap-1 rounded-full px-3 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-2 rounded-full px-3 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 px-8 has-data-[icon=inline-end]:pr-8 has-data-[icon=inline-start]:pl-8",
        icon: "min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px]",
        "icon-xs":
          "size-7 rounded-full in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-9 rounded-full in-data-[slot=button-group]:rounded-lg",
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
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
