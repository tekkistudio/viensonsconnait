"use client"

import * as React from "react"
import { useEffect, useState, useCallback } from "react"
import { ToastProps, Toast, ToastTitle, ToastDescription } from "./toast"

/** Représente nos toasts internes, héritant de ToastProps + un champ id unique. */
interface ToasterToast extends ToastProps {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  open?: boolean
}

/** L'état global contient juste un tableau de toasts. */
interface State {
  toasts: ToasterToast[]
}

/** Déclaration de l'état en mémoire et du dispatch. */
let memoryState: State = { toasts: [] }

/** Listeners pour propager l'état à tous les composants abonnées. */
const listeners: Array<(state: State) => void> = []

/** Ajoute un listener pour mettre à jour l'état local. */
function subscribe(listener: (state: State) => void) {
  listeners.push(listener)
  return () => {
    const index = listeners.indexOf(listener)
    if (index > -1) {
      listeners.splice(index, 1)
    }
  }
}

/** Envoie une action => on met à jour memoryState => on notifie tous les listeners. */
function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

/** Actions possibles pour manipuler les toasts. */
type Action =
  | { type: "ADD_TOAST"; toast: ToasterToast }
  | { type: "DISMISS_TOAST"; toastId?: string }
  | { type: "REMOVE_TOAST"; toastId?: string }
  | { type: "UPDATE_TOAST"; toast: Partial<ToasterToast> }

/** Le reducer qui gère l'état. */
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        // On ajoute le toast en tête
        toasts: [action.toast, ...state.toasts],
      }

    case "DISMISS_TOAST": {
      const toastId = action.toastId
      return {
        ...state,
        toasts: state.toasts.map((t) => {
          if (!toastId || t.id === toastId) {
            return { ...t, open: false }
          }
          return t
        }),
      }
    }

    case "REMOVE_TOAST": {
      const toastId = action.toastId
      if (!toastId) {
        return { ...state, toasts: [] }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== toastId),
      }
    }

    case "UPDATE_TOAST": {
      const { toast } = action
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toast.id ? { ...t, ...toast } : t
        ),
      }
    }

    default:
      return state
  }
}

/** Génère un ID unique pour chaque toast. */
let count = 0
function genId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

/**
 * APi imperatif: tu appelles `toast(...)` pour créer un nouveau toast.
 */
export function toast(toastData: Omit<ToasterToast, "id">) {
  const id = genId()
  dispatch({
    type: "ADD_TOAST",
    toast: {
      id,
      open: true,
      ...toastData,
    },
  })

  const update = (partial: Partial<ToasterToast>) => {
    dispatch({ type: "UPDATE_TOAST", toast: { ...partial, id } })
  }

  const dismiss = () =>
    dispatch({ type: "DISMISS_TOAST", toastId: id })

  return { id, dismiss, update }
}

/**
 * Hook React: donne accès à `toast(...)`, `dismiss(...)` etc. + la liste des toasts.
 */
export function useToast() {
  const [state, setState] = useState<State>(memoryState)

  useEffect(() => {
    // On s'abonne pour écouter les mutations du state global.
    const unsubscribe = subscribe((newState) => {
      setState(newState)
    })
    return unsubscribe
  }, [])

  // Version hook du dispatch imperatif:
  const doToast = useCallback((toastData: Omit<ToasterToast, "id">) => {
    return toast(toastData)
  }, [])

  const dismiss = useCallback((toastId?: string) => {
    dispatch({ type: "DISMISS_TOAST", toastId })
  }, [])

  return {
    // Liste des toasts
    toasts: state.toasts,
    // Fonctions utilitaires
    toast: doToast,
    dismiss,
  }
}

/**
 * Le composant React qui rend la liste de toasts. Tu peux le mettre en haut de l'app.
 */
export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <>
      {toasts.map(({ id, title, description, action, ...props }) => {
        // Quand le toast se ferme (`open` = false), on peut le retirer du state
        const handleClose = () => {
          dismiss(id)
          // Au besoin, on peut faire un setTimeout pour remove...
          setTimeout(() => {
            dispatch({ type: "REMOVE_TOAST", toastId: id })
          }, 300)
        }

        return (
          <Toast
            key={id}
            {...props}
            onClose={handleClose}
          >
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && (
              <ToastDescription>{description}</ToastDescription>
            )}
            {action}
          </Toast>
        )
      })}
    </>
  )
}