'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Copy, ExternalLink, AlertTriangle, Globe, Clock, ShieldAlert } from 'lucide-react'
import { cn } from '@/components/ui/cn'
import { Badge } from '@/components/ui/badge'
import type { Credential } from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDomain(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace('www.', '')
  } catch {
    return url
  }
}

function getFaviconUrl(url: string): string {
  const domain = getDomain(url)
  return `https://www.google.com/s2/favicons?sz=32&domain=${domain}`
}

function FallbackIcon({ name }: { name: string }) {
  const letter = name.trim()[0]?.toUpperCase() ?? '?'
  // Deterministic hue from name string
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div
      className="h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0"
      style={{ background: `hsl(${hue} 55% 40%)` }}
    >
      {letter}
    </div>
  )
}

function strengthVariant(score: number): 'destructive' | 'warning' | 'accent' | 'success' {
  if (score <= 1) return 'destructive'
  if (score === 2) return 'warning'
  if (score === 3) return 'accent'
  return 'success'
}

function strengthLabel(score: number): string {
  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong']
  return labels[Math.min(4, Math.max(0, score))]
}

/** Returns expiry status for a credential. */
function getExpiryStatus(
  passwordChangedAt: number | undefined,
  expiryDays: number
): 'stale' | 'expiring-soon' | null {
  if (!passwordChangedAt || expiryDays === 0) return null
  const ageMs = Date.now() - passwordChangedAt
  const ageDays = ageMs / (24 * 60 * 60 * 1000)
  if (ageDays >= expiryDays) return 'stale'
  if (ageDays >= expiryDays - 14) return 'expiring-soon'
  return null
}

// ---------------------------------------------------------------------------
// Copy button
// ---------------------------------------------------------------------------

interface CopyButtonProps {
  value: string
  label: string
  onCopy: () => void
}

function CopyButton({ label, onCopy }: CopyButtonProps) {
  const [flash, setFlash] = React.useState(false)

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    onCopy()
    setFlash(true)
    setTimeout(() => setFlash(false), 1200)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Copy ${label}`}
      className={cn(
        'h-7 w-7 flex items-center justify-center rounded-md',
        'text-muted-foreground hover:text-foreground',
        'hover:bg-white/8 transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-500',
        'opacity-0 group-hover:opacity-100 transition-opacity'
      )}
    >
      <Copy
        size={13}
        className={cn('transition-colors duration-200', flash && 'text-success-400')}
      />
    </button>
  )
}

// ---------------------------------------------------------------------------
// CredentialCardSkeleton
// ---------------------------------------------------------------------------

// Varying widths so adjacent cards don't look identical
const NAME_WIDTHS  = ['w-28', 'w-36', 'w-24', 'w-32', 'w-20', 'w-28']
const URL_WIDTHS   = ['w-20', 'w-28', 'w-16', 'w-24', 'w-16', 'w-20']
const USER_WIDTHS  = ['w-32', 'w-24', 'w-28', 'w-20', 'w-36', 'w-24']
const BADGE_WIDTHS = ['w-14', 'w-16', 'w-12', 'w-16', 'w-14', 'w-12']

export function CredentialCardSkeleton({ index = 0 }: { index?: number }) {
  const i = index % 6
  return (
    <div
      aria-hidden
      className={cn(
        'flex items-center gap-3 p-4 rounded-vault-card',
        'border border-navy-700/20',
        'bg-gradient-to-br from-[hsl(240_10%_7%/0.60)] to-[hsl(240_10%_5%/0.70)]',
      )}
    >
      {/* Icon */}
      <div className="skeleton h-8 w-8 rounded-lg shrink-0" />

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className={cn('skeleton h-3.5 rounded', NAME_WIDTHS[i])} />
        <div className={cn('skeleton h-2.5 rounded', URL_WIDTHS[i])} />
        <div className={cn('skeleton h-2.5 rounded', USER_WIDTHS[i])} />
      </div>

      {/* Right: badge + buttons */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        <div className={cn('skeleton h-5 rounded-full', BADGE_WIDTHS[i])} />
        <div className="skeleton h-7 w-14 rounded-md" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CredentialCard
// ---------------------------------------------------------------------------

export interface CredentialCardProps {
  credential: Credential
  onCopy: (field: 'username' | 'password', value: string) => void
  onOpen: () => void
  isReused?: boolean
  isBreached?: boolean
  passwordExpiryDays?: number
}

export function CredentialCard({
  credential,
  onCopy,
  onOpen,
  isReused = false,
  isBreached = false,
  passwordExpiryDays = 90,
}: CredentialCardProps) {
  const [faviconError, setFaviconError] = React.useState(false)
  const domain = getDomain(credential.url)
  const expiryStatus = getExpiryStatus(credential.passwordChangedAt, passwordExpiryDays)

  return (
    <motion.div
      layout
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.99 }}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen()}
      className={cn(
        'group relative flex items-center gap-3 p-4 rounded-vault-card cursor-pointer',
        'border border-navy-700/30',
        'bg-gradient-to-br from-[hsl(240_10%_7%/0.90)] to-[hsl(240_10%_5%/0.95)]',
        'shadow-[0_0_0_1px_rgba(99,102,241,0.06),0_2px_12px_rgba(0,0,0,0.35)]',
        'hover:border-navy-600/50',
        'hover:shadow-[0_0_0_1px_rgba(99,102,241,0.18),0_6px_24px_rgba(0,0,0,0.5)]',
        'transition-shadow duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        isBreached && 'border-danger-500/40',
        !isBreached && expiryStatus === 'stale' && 'border-orange-500/25',
        !isBreached && expiryStatus === 'expiring-soon' && 'border-warning-500/20',
      )}
    >
      {/* Favicon / fallback */}
      <div className="shrink-0">
        {credential.faviconUrl && !faviconError ? (
          <img
            src={credential.faviconUrl}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg object-contain"
            onError={() => setFaviconError(true)}
          />
        ) : credential.url && !faviconError ? (
          <img
            src={getFaviconUrl(credential.url)}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg object-contain"
            onError={() => setFaviconError(true)}
          />
        ) : (
          <FallbackIcon name={credential.name} />
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Name row */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground truncate">
            {credential.name}
          </span>
          {isBreached ? (
            <Badge
              variant="destructive"
              className="shrink-0 gap-1 border-danger-500/50 bg-danger-500/20 text-danger-400"
            >
              <ShieldAlert size={10} />
              Breached
            </Badge>
          ) : isReused ? (
            <Badge variant="warning" className="shrink-0 gap-1">
              <AlertTriangle size={10} />
              Reused
            </Badge>
          ) : null}
        </div>

        {/* Domain */}
        {credential.url && (
          <div className="flex items-center gap-1 mt-0.5">
            <Globe size={11} className="text-muted-foreground/70 shrink-0" />
            <span className="text-xs text-muted-foreground truncate">{domain}</span>
          </div>
        )}

        {/* Username row */}
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs text-muted-foreground truncate max-w-[160px]">
            {credential.username}
          </span>
          <CopyButton
            value={credential.username}
            label="username"
            onCopy={() => onCopy('username', credential.username)}
          />
        </div>
      </div>

      {/* Right section: badges + action buttons */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        {/* Strength badge */}
        <Badge variant={strengthVariant(credential.passwordStrengthScore)}>
          {strengthLabel(credential.passwordStrengthScore)}
        </Badge>

        {/* Expiry badge */}
        {expiryStatus === 'stale' && (
          <Badge
            variant="warning"
            className="gap-1 border-orange-500/40 bg-orange-500/15 text-orange-400"
          >
            <Clock size={10} />
            Stale
          </Badge>
        )}
        {expiryStatus === 'expiring-soon' && (
          <Badge variant="warning" className="gap-1">
            <Clock size={10} />
            Expiring
          </Badge>
        )}

        <div className="flex items-center gap-1">
          {/* Copy password (without revealing it) */}
          <CopyButton
            value={credential.password}
            label="password"
            onCopy={() => onCopy('password', credential.password)}
          />

          {/* Open detail */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpen() }}
            aria-label="Open credential"
            className={cn(
              'h-7 w-7 flex items-center justify-center rounded-md',
              'text-muted-foreground hover:text-foreground',
              'hover:bg-white/8 transition-colors duration-150',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-500'
            )}
          >
            <ExternalLink size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
