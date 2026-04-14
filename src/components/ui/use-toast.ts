'use client'

import * as React from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastVariant = 'default' | 'success' | 'error' | 'warning'

export interface ToastData {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  /** Duration in ms. Pass Infinity or 0 to keep indefinitely. Default 4000. */
  duration?: number
}

type ToastAction =
  | { type: 'ADD'; toast: ToastData }
  | { type: 'DISMISS'; id: string }
  | { type: 'REMOVE'; id: string }

// ---------------------------------------------------------------------------
// Internal singleton state — avoids Context prop-drilling for imperatively
// triggered toasts (clipboard copies, etc.)
// ---------------------------------------------------------------------------

let listeners: Array<(toasts: ToastData[]) => void> = []
let memoryToasts: ToastData[] = []

function dispatch(action: ToastAction) {
  switch (action.type) {
    case 'ADD':
      memoryToasts = [action.toast, ...memoryToasts].slice(0, 5)
      break
    case 'DISMISS':
      // Mark as dismissed — the component handles the exit animation then fires REMOVE
      memoryToasts = memoryToasts.map((t) =>
        t.id === action.id ? { ...t, _dismissed: true } as ToastData : t
      )
      break
    case 'REMOVE':
      memoryToasts = memoryToasts.filter((t) => t.id !== action.id)
      break
  }
  listeners.forEach((l) => l([...memoryToasts]))
}

// ---------------------------------------------------------------------------
// useToast hook
// ---------------------------------------------------------------------------

export function useToast() {
  const [toasts, setToasts] = React.useState<ToastData[]>(memoryToasts)

  React.useEffect(() => {
    listeners.push(setToasts)
    return () => {
      listeners = listeners.filter((l) => l !== setToasts)
    }
  }, [])

  function toast(data: Omit<ToastData, 'id'>) {
    const id = Math.random().toString(36).slice(2, 9)
    const duration = data.duration ?? 4000

    dispatch({ type: 'ADD', toast: { ...data, id } })

    if (duration && duration !== Infinity) {
      setTimeout(() => dispatch({ type: 'DISMISS', id }), duration)
    }

    return id
  }

  function dismiss(id: string) {
    dispatch({ type: 'DISMISS', id })
  }

  function remove(id: string) {
    dispatch({ type: 'REMOVE', id })
  }

  return { toast, dismiss, remove, toasts }
}

// ---------------------------------------------------------------------------
// Imperative helper — can be called outside React components
// ---------------------------------------------------------------------------

export function createToast(data: Omit<ToastData, 'id'>) {
  const id = Math.random().toString(36).slice(2, 9)
  const duration = data.duration ?? 4000
  dispatch({ type: 'ADD', toast: { ...data, id } })
  if (duration && duration !== Infinity) {
    setTimeout(() => dispatch({ type: 'DISMISS', id }), duration)
  }
  return id
}
