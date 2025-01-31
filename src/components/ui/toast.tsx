"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import * as ToastPrimitives from "@radix-ui/react-toast"

//
// ─── INTERFACE ──────────────────────────────────────────────────────────────────
//
type RadixToastProps = React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root>

export interface ToastProps extends Omit<RadixToastProps, "title"> {
  id?: string
  /** On redéfinit title en ReactNode plutôt que string */
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  onClose?: () => void
  variant?: "default" | "success" | "error" | "warning" | "destructive"
  duration?: number
  className?: string
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

//
// ─── EXPORTS PRIMITIFS DE RADIX ─────────────────────────────────────────────────
//
export const ToastProvider = ToastPrimitives.Provider

export const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4",
      "sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

/** (Facultatif) On réexporte Title/Description si besoin */
export const ToastTitle = ToastPrimitives.Title
export const ToastDescription = ToastPrimitives.Description

//
// ─── NOTRE COMPOSANT TOAST ──────────────────────────────────────────────────────
//
export const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  ToastProps
>(({
  id,
  title,
  description,
  action,
  onClose,
  variant = "default",
  duration = 5000,
  className,
  children,
  ...props
}, ref) => {
  const [isVisible, setIsVisible] = React.useState(true)

  // Fermeture auto après `duration` ms (sauf Infinity)
  React.useEffect(() => {
    if (duration === Infinity) return

    const timer = setTimeout(() => {
      setIsVisible(false)
      onClose?.()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const variantStyles = {
    default: "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
    success: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    error: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
    warning: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
    destructive: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
  }

  const variantIconColors = {
    default: "text-gray-400 dark:text-gray-500",
    success: "text-green-500 dark:text-green-400",
    error: "text-red-500 dark:text-red-400",
    warning: "text-yellow-500 dark:text-yellow-400",
    destructive: "text-red-500 dark:text-red-400",
  }

  return (
    <ToastPrimitives.Root ref={ref} {...props}>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={cn(
              "w-full shadow-lg rounded-lg border",
              variantStyles[variant],
              className
            )}
          >
            <div className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {title && (
                    <ToastPrimitives.Title className={cn(
                      "font-medium text-gray-900 dark:text-gray-100"
                    )}>
                      {title}
                    </ToastPrimitives.Title>
                  )}
                  {description && (
                    <ToastPrimitives.Description className={cn(
                      "mt-1 text-sm",
                      variant === "default"
                        ? "text-gray-500 dark:text-gray-400"
                        : "text-gray-700 dark:text-gray-300"
                    )}>
                      {description}
                    </ToastPrimitives.Description>
                  )}
                  {action && <div className="mt-3">{action}</div>}
                  {/* On rend les children s'il y en a */}
                  {children}
                </div>

                <ToastPrimitives.Close
                  onClick={() => {
                    setIsVisible(false)
                    onClose?.()
                  }}
                  className={cn(
                    "ml-4 inline-flex hover:opacity-70 transition-opacity",
                    variantIconColors[variant]
                  )}
                >
                  <X className="h-5 w-5" />
                </ToastPrimitives.Close>
              </div>
            </div>
            {duration !== Infinity && (
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: duration / 1000, ease: "linear" }}
                className={cn(
                  "h-1 rounded-b-lg",
                  variant === "default" ? "bg-brand-blue/10" : "bg-current/10"
                )}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </ToastPrimitives.Root>
  )
})
Toast.displayName = "Toast"