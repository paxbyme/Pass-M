/**
 * /vault — Main vault overview page.
 * Loads and displays all credentials with search, filter, and reuse detection.
 *
 * Bonus feature: Vault Health Dashboard — shows a security score and
 * highlights weak/reused/stale passwords so teams can act on them immediately.
 */

'use client'

export const dynamic = 'force-dynamic'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  AlertTriangle,
  TrendingUp,
  Clock,
  ShieldAlert,
} from 'lucide-react'
import Link from 'next/link'
import { useVault } from '@/hooks/useVault'
import { useBreachStore } from '@/store/breach'
import { useVaultStore } from '@/store/vault'
import { useSessionStore } from '@/store/session'
import { useSettingsStore } from '@/store/settings'
import { useClipboard } from '@/hooks/useClipboard'
import { CredentialCard, CredentialCardSkeleton } from '@/components/CredentialCard'
import { SearchBar } from '@/components/SearchBar'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import type { SortOption, StrengthFilter } from '@/components/SearchBar'

// ---------------------------------------------------------------------------
// Vault Health Score — Bonus Feature
// ---------------------------------------------------------------------------

function HealthScore({
  total,
  weakCount,
  reuseCount,
  strongCount,
  staleCount,
  breachCount,
}: {
  total: number
  weakCount: number
  reuseCount: number
  strongCount: number
  staleCount: number
  /** undefined = not yet scanned; omit from score */
  breachCount?: number
}) {
  if (total === 0) return null

  // Score: starts at 100, deduct for each issue type.
  // Breaches are the most severe — they deduct most aggressively.
  const rawScore = Math.max(
    0,
    Math.round(
      100 -
        (breachCount !== undefined ? (breachCount / total) * 45 : 0) -
        (weakCount / total) * 40 -
        (reuseCount / total) * 35 -
        (staleCount / total) * 25
    )
  )
  const color =
    rawScore >= 80
      ? 'text-success-400'
      : rawScore >= 60
      ? 'text-accent-400'
      : rawScore >= 40
      ? 'text-warning-400'
      : 'text-danger-400'
  const strokeColor =
    rawScore >= 80 ? '#4ade80' : rawScore >= 60 ? '#2dd4bf' : rawScore >= 40 ? '#fbbf24' : '#fb7185'
  const bgColor =
    rawScore >= 80
      ? 'bg-success-500'
      : rawScore >= 60
      ? 'bg-accent-500'
      : rawScore >= 40
      ? 'bg-warning-500'
      : 'bg-danger-500'
  const label =
    rawScore >= 80
      ? 'Excellent'
      : rawScore >= 60
      ? 'Good'
      : rawScore >= 40
      ? 'Fair'
      : 'Poor'

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl border border-navy-700/30 bg-[hsl(240_10%_6%/0.6)] p-4"
    >
      <div className="flex items-center gap-4">
        {/* Score ring */}
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="22" fill="none" stroke="hsl(240 10% 12%)" strokeWidth="4" />
            <circle
              cx="28"
              cy="28"
              r="22"
              fill="none"
              strokeWidth="4"
              stroke={strokeColor}
              strokeLinecap="round"
              strokeDasharray={`${(rawScore / 100) * 138.2} 138.2`}
            />
          </svg>
          <span className={`absolute text-sm font-bold tabular-nums ${color}`}>
            {rawScore}
          </span>
        </div>

        {/* Labels */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className={color} />
            <span className="text-sm font-semibold text-foreground">
              Vault Health — <span className={color}>{label}</span>
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-success-500" />
              {strongCount} strong
            </span>
            {weakCount > 0 && (
              <span className="flex items-center gap-1 text-warning-400">
                <AlertTriangle size={11} />
                {weakCount} weak
              </span>
            )}
            {reuseCount > 0 && (
              <span className="flex items-center gap-1 text-danger-400">
                <AlertTriangle size={11} />
                {reuseCount} reused
              </span>
            )}
            {staleCount > 0 && (
              <span className="flex items-center gap-1 text-orange-400">
                <Clock size={11} />
                {staleCount} stale
              </span>
            )}
            {breachCount !== undefined && breachCount > 0 && (
              <span className="flex items-center gap-1 font-medium text-danger-400">
                <ShieldAlert size={11} />
                {breachCount} breached
              </span>
            )}
          </div>
        </div>

        <Link
          href="/settings#health"
          className="shrink-0 text-xs text-accent-400 hover:text-accent-300 transition-colors"
        >
          Details →
        </Link>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 rounded-full bg-navy-800 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${rawScore}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
          className={`h-full rounded-full ${bgColor}`}
        />
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStaleCount(credentials: { passwordChangedAt?: number }[], expiryDays: number): number {
  if (expiryDays === 0) return 0
  const threshold = Date.now() - expiryDays * 24 * 60 * 60 * 1000
  return credentials.filter(
    (c) => c.passwordChangedAt !== undefined && c.passwordChangedAt < threshold
  ).length
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function VaultPage() {
  const router = useRouter()
  const { loadVault, getReuseGroups, isLoading } = useVault()
  const { cryptoKey, userId } = useSessionStore()
  const {
    getFilteredCredentials,
    setSearch,
    setFilter,
    setSort,
    credentials,
  } = useVaultStore()
  const { copy } = useClipboard()
  const { toast } = useToast()
  const settings = useSettingsStore()

  const { results: breachResults, lastChecked: breachLastChecked } = useBreachStore()

  const [reuseIds, setReuseIds] = React.useState<Set<string>>(new Set())
  const [activeCategory, setActiveCategory] = React.useState<string | null>(null)
  const [activeTag, setActiveTag] = React.useState<string | null>(null)
  const [activeStrength, setActiveStrength] = React.useState<StrengthFilter>('all')
  const [activeSort, setActiveSort] = React.useState<SortOption>('name-asc')
  const [vaultLoaded, setVaultLoaded] = React.useState(false)

  // Load vault once on mount
  React.useEffect(() => {
    if (cryptoKey && userId && !vaultLoaded) {
      setVaultLoaded(true)
      loadVault(userId, cryptoKey)
    }
  }, [cryptoKey, userId, vaultLoaded, loadVault])

  // Detect reused passwords whenever credentials change
  React.useEffect(() => {
    if (credentials.length > 1) {
      getReuseGroups().then((groups) => {
        const ids = new Set<string>()
        groups.forEach((creds) => creds.forEach((c) => ids.add(c.id)))
        setReuseIds(ids)
      })
    } else {
      setReuseIds(new Set())
    }
  }, [credentials, getReuseGroups])

  // Derived data for filters and health
  const allTags = React.useMemo(
    () => Array.from(new Set(credentials.flatMap((c) => c.tags))),
    [credentials]
  )
  const allCategories = React.useMemo(
    () => Array.from(new Set(credentials.map((c) => c.category).filter(Boolean))),
    [credentials]
  )

  const weakCount = credentials.filter((c) => c.passwordStrengthScore <= 1).length
  const reuseCount = reuseIds.size
  const strongCount = credentials.filter((c) => c.passwordStrengthScore >= 3).length
  const staleCount = getStaleCount(credentials, settings.passwordExpiryDays)

  // Breach counts — only defined once a scan has been run
  const breachCount =
    breachLastChecked !== null
      ? Object.values(breachResults).filter((n) => n > 0).length
      : undefined

  const filtered = getFilteredCredentials()

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleCopy(field: 'username' | 'password', value: string) {
    copy(value, settings.clipboardClearSeconds)
    toast({
      title: field === 'username' ? 'Username copied' : 'Password copied',
      variant: 'success',
      description: `Clipboard clears in ${settings.clipboardClearSeconds}s`,
    })
  }

  function handleSort(sort: SortOption) {
    setActiveSort(sort)
    const sortKeyMap: Record<SortOption, Parameters<typeof setSort>[0]> = {
      'name-asc': 'name',
      'name-desc': 'name',
      'created-desc': 'created',
      'created-asc': 'created',
      'strength-asc': 'strength',
      'strength-desc': 'strength',
      'accessed-desc': 'used',
    }
    const sortDirMap: Record<SortOption, 'asc' | 'desc'> = {
      'name-asc': 'asc',
      'name-desc': 'desc',
      'created-desc': 'desc',
      'created-asc': 'asc',
      'strength-asc': 'asc',
      'strength-desc': 'desc',
      'accessed-desc': 'desc',
    }
    setSort(sortKeyMap[sort], sortDirMap[sort])
  }

  function handleStrengthFilter(level: StrengthFilter) {
    setActiveStrength(level)
    const strengthMap: Record<StrengthFilter, number | null> = {
      all: null,
      weak: 0,
      fair: 2,
      strong: 3,
    }
    setFilter({ filterStrength: strengthMap[level] })
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6 space-y-5">

      {/* Health dashboard (bonus feature) — only when vault has data */}
      {!isLoading && credentials.length > 0 && (
        <HealthScore
          total={credentials.length}
          weakCount={weakCount}
          reuseCount={reuseCount}
          strongCount={strongCount}
          staleCount={staleCount}
          breachCount={breachCount}
        />
      )}

      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Vault</h1>
          {credentials.length > 0 && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {credentials.length} credential{credentials.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Button variant="accent" size="sm" asChild>
          <Link href="/vault/new">
            <Plus size={15} />
            Add
          </Link>
        </Button>
      </div>

      {/* Search + filters (only when there are credentials) */}
      {credentials.length > 0 && (
        <SearchBar
          onSearch={(q) => setSearch(q)}
          onCategoryFilter={(c) => {
            setActiveCategory(c)
            setFilter({ filterCategory: c ?? '' })
          }}
          onTagFilter={(t) => {
            setActiveTag(t)
            setFilter({ filterTag: t ?? '' })
          }}
          onStrengthFilter={handleStrengthFilter}
          onSort={handleSort}
          categories={allCategories}
          tags={allTags}
          activeCategory={activeCategory}
          activeTag={activeTag}
          activeStrength={activeStrength}
          activeSort={activeSort}
        />
      )}

      {/* Loading skeletons — match the credential grid layout */}
      {isLoading && (
        <div role="status" aria-label="Loading credentials" className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: i * 0.04 }}
            >
              <CredentialCardSkeleton index={i} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && credentials.length === 0 && <EmptyState />}

      {/* No results */}
      {!isLoading && credentials.length > 0 && filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No credentials match your search or filters.
        </div>
      )}

      {/* Credential grid */}
      {!isLoading && filtered.length > 0 && (
        <motion.div layout className="grid gap-3 lg:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {filtered.map((cred) => (
              <motion.div
                key={cred.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.15 }}
              >
                <CredentialCard
                  credential={cred}
                  isReused={reuseIds.has(cred.id)}
                  isBreached={breachLastChecked !== null && (breachResults[cred.id] ?? 0) > 0}
                  onCopy={handleCopy}
                  onOpen={() => router.push(`/vault/${cred.id}`)}
                  passwordExpiryDays={settings.passwordExpiryDays}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
