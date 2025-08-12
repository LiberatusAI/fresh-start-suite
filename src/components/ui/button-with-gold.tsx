import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-base font-medium transition-all duration-200 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 font-sans",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-accent/40 hover:text-primary active:scale-98 focus:outline-none",
        outline: "border border-input bg-background hover:bg-accent/20 hover:text-primary focus:outline-none",
        secondary: "bg-muted text-foreground hover:bg-accent/30 focus:outline-none",
        ghost: "hover:bg-accent/10 hover:text-primary focus:outline-none",
        link: "text-primary underline-offset-4 hover:underline focus:outline-none",
        gold: "bg-gold text-white hover:bg-gold-dark focus:outline-none active:scale-98",
      },
      size: {
        default: "min-h-[44px] px-6 py-3",
        sm: "min-h-[36px] rounded-lg px-4 py-2",
        lg: "min-h-[56px] rounded-2xl px-10 py-4 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }