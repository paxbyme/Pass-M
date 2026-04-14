'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Eye, EyeOff, Copy, Check } from 'lucide-react'
import { cn } from '@/components/ui/cn'
import { StrengthBar } from '@/components/StrengthBar'
import { useToast } from '@/components/ui/use-toast'

export interface PasswordFieldProps {
  value: string
  onChange: (v: string) => void
  label?: string
  showStrength?: boolean
  showCopy?: boolean
  showReveal?: boolean
  placeholder?: string
  name?: string
  id?: string
  error?: string
  className?: string
  /** When true the field is read-only (e.g. generated password display) */
  readOnly?: boolean
  /** Seconds before clipboard is auto-cleared. Default: 30 */
  clipboardClearSeconds?: number
}

export function PasswordField({
  value,
  onChange,
  label,
  showStrength = false,
  showCopy = false,
  showReveal = true,
  placeholder = '••••••••',
  name,
  id,
  error,
  className,
  readOnly = false,
  clipboardClearSeconds = 30,
}: PasswordFieldProps) {
  const [revealed, setRevealed] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const { toast } = useToast()
  const clearTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const generatedId = React.useId()
  const inputId = id ?? name ?? generatedId

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
    }
  }, [])

  async function handleCopy() {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)

      toast({
        title: 'Password copied',
        description: `Clipboard will be cleared in ${clipboardClearSeconds}s`,
        variant: 'success',
      })

      // Auto-clear clipboard
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
      clearTimerRef.current = setTimeout(async () => {
        try {
          // Only clear if the clipboard still contains the same value
          const current = await navigator.clipboard.readText()
          if (current === value) {
            await navigator.clipboard.writeText('')
          }
        } catch {
          // readText may fail without focus; that's fine
        }
      }, clipboardClearSeconds * 1000)

      // Reset icon after 2 s
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: 'Copy failed', variant: 'error' })
    }
  }

  const trailingIcons = (
    <span className="flex items-center gap-0.5 pr-1">
      {showCopy && (
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md',
            'text-muted-foreground hover:text-foreground',
            'hover:bg-white/8 transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-500'
          )}
          aria-label="Copy password"
          tabIndex={0}
        >
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.span
                key="check"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-success-400"
              >
                <Check size={15} />
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Copy size={15} />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      )}

      {showReveal && (
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md',
            'text-muted-foreground hover:text-foreground',
            'hover:bg-white/8 transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-500'
          )}
          aria-label={revealed ? 'Hide password' : 'Show password'}
          aria-pressed={revealed}
          tabIndex={0}
        >
          {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      )}
    </span>
  )

  const hasTrailing = showCopy || showReveal

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-foreground"
        >
          {label}
        </label>
      )}

      {/* Input wrapper */}
      <div className="relative flex items-center">
        <input
          id={inputId}
          name={name}
          type={revealed ? 'text' : 'password'}
          value={value}
          onChange={readOnly ? undefined : (e) => onChange(e.target.value)}
          readOnly={readOnly}
          placeholder={placeholder}
          autoComplete="current-password"
          spellCheck={false}
          className={cn(
            'flex h-9 w-full rounded-lg px-3 py-2 text-sm',
            'font-mono tracking-widest',
            'bg-navy-900 border border-navy-700/60',
            'text-foreground placeholder:text-muted-foreground placeholder:tracking-normal placeholder:font-sans',
            'transition-colors duration-150',
            'focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/40',
            'disabled:cursor-not-allowed disabled:opacity-50',
            readOnly && 'cursor-default select-all',
            error && 'border-danger-500/70 focus:border-danger-500 focus:ring-danger-500/30',
            hasTrailing && 'pr-20'
          )}
        />

        {hasTrailing && (
          <div className="absolute right-0 flex items-center">
            {trailingIcons}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-danger-400"
        >
          {error}
        </motion.p>
      )}

      {/* Strength bar */}
      {showStrength && (
        <StrengthBar password={value} showLabel className="pt-0.5" />
      )}
    </div>
  )
}
