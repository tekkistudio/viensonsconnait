// src/components/ui/badge.tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-slate-900 text-slate-50",
        promo: "bg-[#FF7E93] text-white",
        new: "bg-[#132D5D] text-white",
        app: "bg-[#132D5D] text-white",
        special: "bg-[#FFD700] text-slate-900", 
        outline: "border border-gray-200 text-gray-800 dark:border-gray-700 dark:text-gray-200",
        primary: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
        success: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
        warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
        error: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
      }
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }