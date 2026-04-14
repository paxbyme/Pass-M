'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, Settings, Wand2, Sun, Moon, Monitor, ShieldCheck } from 'lucide-react'
import { cn } from '@/components/ui/cn'
import { Button } from '@/components/ui/button'
import { useSettingsStore } from '@/store/settings'
import { useSessionStore } from '@/store/session'
import type { VaultSettings } from '@/types'

// ---------------------------------------------------------------------------
// DarkMode cycle button
// ---------------------------------------------------------------------------

const modeIcons: Record<VaultSettings['darkMode'], React.ReactNode> = {
  dark: <Moon size={15} />,
  light: <Sun size={15} />,
  system: <Monitor size={15} />,
}

const modeLabels: Record<VaultSettings['darkMode'], string> = {
  dark: 'Dark mode',
  light: 'Light mode',
  system: 'System theme',
}

const modeCycle: VaultSettings['darkMode'][] = ['dark', 'light', 'system']

function DarkModeToggle() {
  const darkMode = useSettingsStore((s) => s.darkMode)
  const updateSettings = useSettingsStore((s) => s.updateSettings)

  function cycle() {
    const nextIndex = (modeCycle.indexOf(darkMode) + 1) % modeCycle.length
    updateSettings({ darkMode: modeCycle[nextIndex] })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycle}
      aria-label={`Current theme: ${modeLabels[darkMode]}. Click to cycle.`}
      title={modeLabels[darkMode]}
    >
      <motion.span
        key={darkMode}
        initial={{ rotate: -30, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {modeIcons[darkMode]}
      </motion.span>
    </Button>
  )
}

// ---------------------------------------------------------------------------
// NavLink — shows active state
// ---------------------------------------------------------------------------

function NavLink({
  href,
  icon,
  label,
  className,
}: {
  href: string
  icon: React.ReactNode
  label: string
  className?: string
}) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/vault' && pathname.startsWith(href))

  return (
    <Button
      variant="ghost"
      size="icon"
      asChild
      className={cn(isActive && 'text-foreground bg-white/8', className)}
    >
      <Link href={href} aria-label={label} title={label}>
        {icon}
      </Link>
    </Button>
  )
}

// ---------------------------------------------------------------------------
// VaultHeader
// ---------------------------------------------------------------------------

export interface VaultHeaderProps {
  onLock?: () => void
  className?: string
}

export function VaultHeader({ onLock, className }: VaultHeaderProps) {
  const lock = useSessionStore((s) => s.lock)
  const companyName = useSettingsStore((s) => s.companyName)

  function handleLock() {
    lock()
    onLock?.()
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'sticky top-0 z-40',
        'flex h-14 items-center gap-3 px-4',
        'border-b border-navy-700/25',
        'bg-[hsl(240_12%_5%/0.94)] backdrop-blur-xl',
        'shadow-[0_1px_0_rgba(255,255,255,0.04),0_2px_16px_rgba(0,0,0,0.2)]',
        className
      )}
    >
      {/* Brand */}
      <Link
        href="/vault"
        className="flex items-center gap-2.5 mr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg px-1"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-navy-500 to-accent-600 shadow-glow shrink-0">
          <ShieldCheck size={14} className="text-white" />
        </span>
        <span className="text-sm font-bold tracking-tight text-foreground hidden sm:block">
          Pass<span className="text-accent-400">M</span>
        </span>
        {companyName && (
          <span className="hidden md:block text-xs text-muted-foreground/60 border-l border-navy-700/40 pl-2.5 ml-0.5">
            {companyName}
          </span>
        )}
      </Link>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Navigation actions */}
      <nav className="flex items-center gap-0.5" aria-label="Vault navigation">
        <NavLink href="/generator" icon={<Wand2 size={15} />} label="Password generator" />
        <NavLink href="/settings" icon={<Settings size={15} />} label="Settings" />
        <DarkModeToggle />

        {/* Lock vault */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLock}
          aria-label="Lock vault"
          className="hover:text-danger-400 hover:bg-danger-500/10"
          title="Lock vault"
        >
          <Lock size={15} />
        </Button>
      </nav>
    </motion.header>
  )
}
