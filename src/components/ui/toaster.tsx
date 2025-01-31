"use client"

import {
  Toast,
  ToastProvider,
  ToastViewport,
  ToastTitle,
  ToastDescription,
} from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"

export function Toaster() {
  // Récupère la liste des toasts et leur state
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, ...props }) => (
        <Toast key={id} {...props}>
          {title && <ToastTitle>{title}</ToastTitle>}
          {description && <ToastDescription>{description}</ToastDescription>}
          {action /* s'il s'agit déjà d'un composant React, p.ex. <ToastAction> */}
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}

export default Toaster