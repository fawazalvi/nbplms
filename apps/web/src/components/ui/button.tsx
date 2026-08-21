import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-emerald-800 text-white hover:bg-emerald-900 shadow-sm shadow-emerald-950/10",
        nbp: "bg-gradient-to-r from-emerald-800 to-teal-700 text-white hover:from-emerald-900 hover:to-teal-800 shadow-md shadow-emerald-900/20",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200",
        outline: "border border-emerald-800 text-emerald-800 bg-transparent hover:bg-emerald-50",
        ghost: "hover:bg-slate-100 text-slate-700",
        destructive: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
        gold: "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-semibold hover:from-amber-600 hover:to-amber-700 shadow-md shadow-amber-500/20",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-xl px-6 text-base font-semibold",
        icon: "h-10 w-10",
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
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
