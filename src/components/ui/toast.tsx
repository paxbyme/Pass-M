'use client'

import * as React from 'react'
import * as RadixToast from '@radix-ui/react-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/components/ui/cn'
import { useToast, type ToastData, type ToastVariant } from '@/components/ui/use-toast'

// ---------------------------------------------------------------------------
// Variant config
// ---------------------------------------------------------------------------

interface VariantConfig {
  containerClass: string
  iconClass: string
  Icon: React.ElementType
  barClass: string
}

const variantConfig: Record<ToastVariant, VariantConfig> = {
  default: {
    containerClass:
      'bg-[hsl(240_10%_8%/0.96)] border-navy-600/50 text-foreground',
    iconClass: 'text-navy-400',
    Icon: Info,
    barClass: 'bg-navy-500',
  },
  success: {
    containerClass:
      'bg-[hsl(240_10%_8%/0.96)] border-success-500/40 text-foreground',
    iconClass: 'text-success-400',
    Icon: CheckCircle2,
    barClass: 'bg-success-500',
  },
  error: {
    containerClass:
      'bg-[hsl(240_10%_8%/0.96)] border-danger-500/40 text-foreground',
    iconClass: 'text-danger-400',
    Icon: AlertCircle,
    barClass: 'bg-danger-500',
  },
  warning: {
    containerClass:
      'bg-[hsl(240_10%_8%/0.96)] border-warning-500/40 text-foreground',
    iconClass: 'text-warning-400',
    Icon: AlertTriangle,
    barClass: 'bg-warning-500',
  },
}

// ---------------------------------------------------------------------------
// Individual Toast item
// ---------------------------------------------------------------------------

interface ToastItemProps {
  toast: ToastData & { _dismissed?: boolean }
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const cfg = variantConfig[toast.variant ?? 'default']
  const { Icon, containerClass, iconClass, barClass } = cfg
  const duration = toast.duration ?? 4000
  const showProgressBar = duration !== Infinity && duration > 0

  return (
    <RadixToast.Root asChild forceMount open={!toast._dismissed}>
      <motion.div
        layout
        initial={{ opacity: 0, x: 60, scale: 0.92 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 80, scale: 0.88 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onAnimationComplete={() => {
          if (toast._dismissed) onRemove(toast.id)
        }}
        className={cn(
          'relative flex w-[360px] max-w-[calc(100vw-2rem)] items-start gap-3',
          'rounded-xl border p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
          'backdrop-blur-xl overflow-hidden',
          containerClass
        )}
      >
        {/* Variant icon */}
        <span className={cn('mt-0.5 shrink-0', iconClass)}>
          <Icon size={18} />
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {toast.title && (
            <RadixToast.Title className="text-sm font-semibold leading-snug">
              {toast.title}
            </RadixToast.Title>
          )}
          {toast.description && (
            <RadixToast.Description
              className={cn(
                'text-sm text-muted-foreground leading-snug',
                toast.title && 'mt-0.5'
              )}
            >
              {toast.description}
            </RadixToast.Description>
          )}
        </div>

        {/* Close button */}
        <RadixToast.Close asChild>
          <button
            onClick={() => onRemove(toast.id)}
            className="shrink-0 mt-0.5 rounded-md p-0.5 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
            aria-label="Close notification"
          >
            <X size={14} />
          </button>
        </RadixToast.Close>

        {/* Progress bar */}
        {showProgressBar && (
          <motion.div
            className={cn('absolute bottom-0 left-0 h-[2px] rounded-full', barClass)}
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: duration / 1000, ease: 'linear' }}
          />
        )}
      </motion.div>
    </RadixToast.Root>
  )
}

// ---------------------------------------------------------------------------
// Toast Provider — mount once at the app root (layout.tsx)
// ---------------------------------------------------------------------------

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, remove } = useToast()

  return (
    <RadixToast.Provider swipeDirection="right" duration={Infinity}>
      {children}

      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            toast={t as ToastData & { _dismissed?: boolean }}
            onRemove={remove}
          />
        ))}
      </AnimatePresence>

      <RadixToast.Viewport
        className={cn(
          'fixed bottom-4 right-4 z-[100]',
          'flex flex-col gap-2',
          'outline-none',
          // Ensure pointer events work on toasts but not empty viewport space
          'pointer-events-none [&>*]:pointer-events-auto'
        )}
      />
    </RadixToast.Provider>
  )
}

// ---------------------------------------------------------------------------
// Re-export for convenience
// ---------------------------------------------------------------------------

export { useToast } from '@/components/ui/use-toast'
