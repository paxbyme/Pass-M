'use client'

import * as React from 'react'
import * as Slider from '@radix-ui/react-slider'
import * as Switch from '@radix-ui/react-switch'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Copy, Check, Zap } from 'lucide-react'
import { cn } from '@/components/ui/cn'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StrengthBar } from '@/components/StrengthBar'
import { generatePassword, type GeneratorOptions } from '@/lib/generator'
import { useToast } from '@/components/ui/use-toast'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PasswordGeneratorProps {
  onUse?: (password: string) => void
  embedded?: boolean
}

// ---------------------------------------------------------------------------
// Toggle option row
// ---------------------------------------------------------------------------

interface ToggleRowProps {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  id: string
}

function ToggleRow({ label, checked, onChange, id }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="text-sm text-muted-foreground cursor-pointer select-none flex-1">
        {label}
      </label>
      <Switch.Root
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
          'transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          checked ? 'bg-accent-500' : 'bg-navy-700/70'
        )}
      >
        <Switch.Thumb
          className={cn(
            'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg',
            'transition-transform duration-200',
            'data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0'
          )}
        />
      </Switch.Root>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const DEFAULT_OPTIONS: GeneratorOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: false,
}

export function PasswordGenerator({ onUse, embedded = false }: PasswordGeneratorProps) {
  const [options, setOptions] = React.useState<GeneratorOptions>(DEFAULT_OPTIONS)
  const [password, setPassword] = React.useState('')
  const [copied, setCopied] = React.useState(false)
  const [isSpinning, setIsSpinning] = React.useState(false)
  const { toast } = useToast()

  // Generate on mount and whenever options change
  React.useEffect(() => {
    try {
      setPassword(generatePassword(options))
    } catch {
      setPassword('')
    }
  }, [options])

  function refresh() {
    setIsSpinning(true)
    try {
      setPassword(generatePassword(options))
    } catch {
      // No-op if options are invalid (e.g. all sets disabled)
    }
    setTimeout(() => setIsSpinning(false), 400)
  }

  async function handleCopy() {
    if (!password) return
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      toast({ title: 'Password copied', variant: 'success', description: 'Clipboard will auto-clear in 30s' })
      setTimeout(() => setCopied(false), 2000)
      setTimeout(async () => {
        try {
          const curr = await navigator.clipboard.readText()
          if (curr === password) await navigator.clipboard.writeText('')
        } catch { /* no-op */ }
      }, 30_000)
    } catch {
      toast({ title: 'Copy failed', variant: 'error' })
    }
  }

  function updateOption<K extends keyof GeneratorOptions>(key: K, value: GeneratorOptions[K]) {
    setOptions((prev) => ({ ...prev, [key]: value }))
  }

  const content = (
    <div className={cn('space-y-4', embedded ? '' : 'max-w-md mx-auto')}>
      {/* Password display */}
      <div
        className={cn(
          'group relative rounded-lg overflow-hidden',
          'bg-navy-950/80 border border-navy-700/50',
          'flex items-center gap-2 px-3',
          embedded ? 'py-2.5' : 'py-3'
        )}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={password}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'flex-1 font-mono text-foreground break-all select-all',
              embedded ? 'text-sm' : 'text-base',
              'tracking-wide'
            )}
          >
            {password || <span className="text-muted-foreground italic text-sm">Enable at least one character set</span>}
          </motion.span>
        </AnimatePresence>

        <div className="flex items-center gap-1 shrink-0">
          {/* Refresh */}
          <button
            type="button"
            onClick={refresh}
            aria-label="Regenerate password"
            className={cn(
              'h-8 w-8 flex items-center justify-center rounded-md',
              'text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors'
            )}
          >
            <motion.span animate={{ rotate: isSpinning ? 360 : 0 }} transition={{ duration: 0.4 }}>
              <RefreshCw size={15} />
            </motion.span>
          </button>
          {/* Copy */}
          <button
            type="button"
            onClick={handleCopy}
            disabled={!password}
            aria-label="Copy password"
            className={cn(
              'h-8 w-8 flex items-center justify-center rounded-md',
              'text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              {copied ? (
                <motion.span key="c" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.15 }} className="text-success-400">
                  <Check size={15} />
                </motion.span>
              ) : (
                <motion.span key="u" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.15 }}>
                  <Copy size={15} />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Strength bar */}
      <StrengthBar password={password} />

      {/* Length slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Length</span>
          <span className="text-sm font-mono text-accent-400 tabular-nums w-8 text-right">
            {options.length}
          </span>
        </div>
        <Slider.Root
          value={[options.length]}
          onValueChange={([v]) => updateOption('length', v)}
          min={8}
          max={128}
          step={1}
          className="relative flex items-center w-full h-5 select-none touch-none"
        >
          <Slider.Track className="relative h-1.5 w-full grow rounded-full bg-navy-800/80">
            <Slider.Range className="absolute h-full rounded-full bg-gradient-to-r from-navy-500 to-accent-500" />
          </Slider.Track>
          <Slider.Thumb
            className={cn(
              'block h-4 w-4 rounded-full bg-white shadow-md',
              'border-2 border-accent-500',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'hover:scale-110 transition-transform cursor-grab active:cursor-grabbing'
            )}
            aria-label="Password length"
          />
        </Slider.Root>
        <div className="flex justify-between text-xs text-muted-foreground/60">
          <span>8</span>
          <span>128</span>
        </div>
      </div>

      {/* Character toggles */}
      <div className="space-y-3 pt-1">
        <ToggleRow
          id="gen-uppercase"
          label="Uppercase (A–Z)"
          checked={options.uppercase}
          onChange={(v) => updateOption('uppercase', v)}
        />
        <ToggleRow
          id="gen-numbers"
          label="Numbers (0–9)"
          checked={options.numbers}
          onChange={(v) => updateOption('numbers', v)}
        />
        <ToggleRow
          id="gen-symbols"
          label="Symbols (!@#…)"
          checked={options.symbols}
          onChange={(v) => updateOption('symbols', v)}
        />
        <ToggleRow
          id="gen-ambiguous"
          label="Exclude ambiguous (0, O, l, 1)"
          checked={options.excludeAmbiguous}
          onChange={(v) => updateOption('excludeAmbiguous', v)}
        />
      </div>

      {/* Use button */}
      {onUse && (
        <Button
          variant="accent"
          className="w-full"
          onClick={() => password && onUse(password)}
          disabled={!password}
        >
          <Zap size={15} />
          Use this password
        </Button>
      )}
    </div>
  )

  if (embedded) {
    return (
      <div className={cn('rounded-lg border border-navy-700/40 bg-navy-900/40 p-4')}>
        {content}
      </div>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap size={18} className="text-accent-400" />
          Password Generator
        </CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
}
