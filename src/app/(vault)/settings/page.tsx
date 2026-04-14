/**
 * /settings — Vault settings page.
 *
 * Sections:
 *  1. Security  — Change master password, auto-lock, clipboard behaviour
 *  2. Vault Health — Security score & actionable breakdown (bonus feature)
 *  3. Export    — Download a plain-JSON backup of the vault
 *  4. Categories & Departments — Manage grouping labels
 *  5. Preferences — Company name, password reveal default, expiry tracking
 */

'use client'

export const dynamic = 'force-dynamic'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Lock,
  Download,
  Tag,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Plus,
  X,
  Settings2,
  TrendingUp,
  ChevronRight,
  Clock,
  ShieldAlert,
  ScanSearch,
} from 'lucide-react'
import * as Switch from '@radix-ui/react-switch'
import Link from 'next/link'
import { getDoc, setDoc, doc } from 'firebase/firestore'
import { getUserSaltRef, getUserVaultRef } from '@/lib/firebase'
import {
  deriveKey,
  generateSalt,
  encryptVaultEntry,
  decryptVaultEntry,
} from '@/lib/crypto'
import { useSessionStore } from '@/store/session'
import { useSettingsStore } from '@/store/settings'
import { useVaultStore } from '@/store/vault'
import { useVault } from '@/hooks/useVault'
import { useBreachStore } from '@/store/breach'
import { checkVaultBreaches } from '@/lib/breach'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/components/ui/cn'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CANARY = 'PASSMV1_VALID'

function saltToBase64(salt: Uint8Array): string {
  return btoa(String.fromCharCode(...Array.from(salt)))
}

function base64ToSalt(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64).split('').map((c) => c.charCodeAt(0)))
}

function getPasswordAgeDays(passwordChangedAt: number | undefined): number | null {
  if (!passwordChangedAt) return null
  return Math.floor((Date.now() - passwordChangedAt) / (24 * 60 * 60 * 1000))
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({
  title,
  icon,
  id,
  children,
}: {
  title: string
  icon: React.ReactNode
  id?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-navy-700/30">
        <span className="text-accent-400">{icon}</span>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function SwitchToggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  id: string
}) {
  return (
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
  )
}

// ---------------------------------------------------------------------------
// Change master password section
// ---------------------------------------------------------------------------

function ChangeMasterPassword() {
  const { toast } = useToast()
  const { cryptoKey, userId, unlock } = useSessionStore()
  const { credentials } = useVaultStore()

  const [currentPwd, setCurrentPwd] = React.useState('')
  const [newPwd, setNewPwd] = React.useState('')
  const [confirmPwd, setConfirmPwd] = React.useState('')
  const [showCurrent, setShowCurrent] = React.useState(false)
  const [showNew, setShowNew] = React.useState(false)
  const [isChanging, setIsChanging] = React.useState(false)
  const [error, setError] = React.useState('')

  async function handleChange(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (newPwd.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (newPwd !== confirmPwd) {
      setError('New passwords do not match.')
      return
    }
    if (!userId || !cryptoKey) return

    setIsChanging(true)
    try {
      // Step 1: Verify current password
      const saltDoc = await getDoc(getUserSaltRef(userId))
      if (!saltDoc.exists()) throw new Error('No salt found')

      const data = saltDoc.data() as { salt: string; verifier: string }
      const existingSalt = base64ToSalt(data.salt)
      const currentKey = await deriveKey(currentPwd, existingSalt)
      const result = (await decryptVaultEntry(data.verifier, currentKey)) as { v: string }
      if (result.v !== CANARY) throw new Error('Wrong current password')

      // Step 2: Derive new key + new verifier
      const newSalt = generateSalt()
      const newKey = await deriveKey(newPwd, newSalt)
      const newVerifier = await encryptVaultEntry({ v: CANARY }, newKey)

      // Step 3: Re-encrypt all vault entries with the new key.
      // We use the in-memory (already decrypted) credentials for efficiency.
      if (credentials.length > 0) {
        await Promise.all(
          credentials.map(async (cred) => {
            const encryptedData = await encryptVaultEntry(cred, newKey)
            const credDocRef = doc(getUserVaultRef(userId), cred.id)
            await setDoc(credDocRef, {
              encryptedData,
              createdAt: cred.createdAt,
              updatedAt: cred.updatedAt,
            })
          })
        )
      }

      // Step 4: Persist the new salt + verifier
      await setDoc(getUserSaltRef(userId), {
        salt: saltToBase64(newSalt),
        verifier: newVerifier,
      })

      // Step 5: Update session with new key
      unlock(newKey, userId, null, newSalt)

      toast({ title: 'Master password changed', variant: 'success' })
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
    } catch {
      setError('Current password is incorrect.')
    } finally {
      setIsChanging(false)
    }
  }

  const inputCls =
    'flex h-9 w-full rounded-lg border border-navy-700/60 bg-navy-900 px-3 pr-9 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500/40'

  return (
    <form onSubmit={handleChange} className="space-y-3">
      {/* Current password */}
      <div className="space-y-1.5">
        <label className="text-sm text-muted-foreground">Current password</label>
        <div className="relative">
          <input
            type={showCurrent ? 'text' : 'password'}
            value={currentPwd}
            onChange={(e) => { setCurrentPwd(e.target.value); setError('') }}
            placeholder="Enter current master password"
            className={inputCls}
          />
          <button
            type="button"
            onClick={() => setShowCurrent((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {/* New password */}
      <div className="space-y-1.5">
        <label className="text-sm text-muted-foreground">New password</label>
        <div className="relative">
          <input
            type={showNew ? 'text' : 'password'}
            value={newPwd}
            onChange={(e) => { setNewPwd(e.target.value); setError('') }}
            placeholder="Create a new master password"
            className={inputCls}
          />
          <button
            type="button"
            onClick={() => setShowNew((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {/* Confirm */}
      <div className="space-y-1.5">
        <label className="text-sm text-muted-foreground">Confirm new password</label>
        <input
          type="password"
          value={confirmPwd}
          onChange={(e) => { setConfirmPwd(e.target.value); setError('') }}
          placeholder="Confirm new master password"
          className={inputCls.replace('pr-9', 'pr-3')}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-danger-400/10 px-3 py-2 text-sm text-danger-400">
          <AlertCircle size={13} className="shrink-0" />
          {error}
        </div>
      )}

      {credentials.length > 0 && (
        <p className="text-xs text-muted-foreground/60 flex items-center gap-1.5">
          <ShieldAlert size={12} className="shrink-0" />
          All {credentials.length} credential{credentials.length !== 1 ? 's' : ''} will be re-encrypted with the new key.
        </p>
      )}

      <Button
        type="submit"
        variant="default"
        size="sm"
        disabled={isChanging || !currentPwd || !newPwd || !confirmPwd}
      >
        {isChanging ? <><Loader2 size={13} className="animate-spin" />Changing…</> : 'Change password'}
      </Button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Breach detection helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(ts: number): string {
  const diffMs = Date.now() - ts
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? 's' : ''} ago`
  const diffDays = Math.floor(diffHr / 24)
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
}

// ---------------------------------------------------------------------------
// BreachScan — the "one feature we didn't ask for"
//
// Uses HaveIBeenPwned k-anonymity API to check every stored password against
// known breach databases without the passwords ever leaving the device.
//
// How it works:
//   1. SHA-1 hash the password client-side.
//   2. Send only the first 5 hex chars (out of 40) to HIBP.
//   3. HIBP responds with ~800 hash suffixes that share that prefix.
//   4. Check locally if our full suffix appears in the list.
//   5. If it does, report how many times it appeared in breaches.
// ---------------------------------------------------------------------------

function BreachScan() {
  const { credentials } = useVaultStore()
  const {
    results,
    lastChecked,
    isChecking,
    progress,
    error,
    setResults,
    setChecking,
    setError,
  } = useBreachStore()

  const compromisedIds = Object.entries(results)
    .filter(([, count]) => count > 0)
    .map(([id]) => id)
  const compromisedCount = compromisedIds.length
  const hasResults = lastChecked !== null

  async function handleScan() {
    if (credentials.length === 0) return
    setChecking(true, { current: 0, total: credentials.length })

    try {
      const newResults = await checkVaultBreaches(
        credentials.map((c) => ({ id: c.id, password: c.password })),
        (current, total) => setChecking(true, { current, total })
      )
      setResults(newResults)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed — check your connection.')
    }
  }

  const compromisedCredentials = credentials.filter((c) => (results[c.id] ?? 0) > 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Breach Detection</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Checks every password against{' '}
            <span className="text-foreground/70">HaveIBeenPwned</span> using k-anonymity —
            only anonymous hash prefixes are sent. Passwords never leave your device.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleScan}
          disabled={isChecking || credentials.length === 0}
          className="shrink-0"
        >
          {isChecking ? (
            <><Loader2 size={13} className="animate-spin" />Scanning…</>
          ) : (
            <><ScanSearch size={13} />Scan vault</>
          )}
        </Button>
      </div>

      {/* Progress bar */}
      {isChecking && progress && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Checking {progress.current} of {progress.total} credentials…</span>
            <span className="tabular-nums">
              {Math.round((progress.current / progress.total) * 100)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-navy-800 overflow-hidden">
            <motion.div
              animate={{ width: `${(progress.current / progress.total) * 100}%` }}
              transition={{ duration: 0.3 }}
              className="h-full rounded-full bg-accent-500"
            />
          </div>
        </motion.div>
      )}

      {/* Error */}
      {error && !isChecking && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-lg border border-danger-400/20 bg-danger-400/10 px-3 py-2.5 text-sm text-danger-400"
        >
          <AlertCircle size={13} className="shrink-0" />
          {error}
        </motion.div>
      )}

      {/* Results */}
      {hasResults && !isChecking && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {/* Summary card */}
          <div
            className={cn(
              'flex items-center gap-3 rounded-xl border p-3',
              compromisedCount > 0
                ? 'border-danger-500/25 bg-danger-500/6'
                : 'border-success-500/25 bg-success-500/6'
            )}
          >
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                compromisedCount > 0 ? 'bg-danger-500/20' : 'bg-success-500/20'
              )}
            >
              {compromisedCount > 0 ? (
                <ShieldAlert size={16} className="text-danger-400" />
              ) : (
                <CheckCircle2 size={16} className="text-success-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-sm font-semibold',
                compromisedCount > 0 ? 'text-danger-400' : 'text-success-400'
              )}>
                {compromisedCount > 0
                  ? `${compromisedCount} compromised password${compromisedCount !== 1 ? 's' : ''} found`
                  : 'No breaches detected'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {credentials.length} credential{credentials.length !== 1 ? 's' : ''} scanned
                {lastChecked ? ` · ${formatRelativeTime(lastChecked)}` : ''}
              </p>
            </div>
            {hasResults && (
              <button
                type="button"
                onClick={handleScan}
                disabled={isChecking}
                className="shrink-0 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors disabled:pointer-events-none"
                title="Re-scan"
              >
                Re-scan
              </button>
            )}
          </div>

          {/* Compromised credentials list */}
          {compromisedCount > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-danger-400 flex items-center gap-1.5">
                <ShieldAlert size={11} />
                Replace these passwords immediately
              </p>
              <div className="space-y-1">
                {compromisedCredentials.map((c) => (
                  <Link
                    key={c.id}
                    href={`/vault/${c.id}`}
                    className="flex items-center justify-between rounded-lg border border-danger-500/20 bg-danger-500/5 px-3 py-2.5 hover:bg-danger-500/10 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-6 w-6 shrink-0 rounded-md bg-danger-500/20 flex items-center justify-center">
                        <ShieldAlert size={12} className="text-danger-400" />
                      </div>
                      <span className="text-sm text-foreground truncate">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-danger-400 tabular-nums">
                        {(results[c.id] ?? 0).toLocaleString()}× in breaches
                      </span>
                      <ChevronRight size={12} className="text-danger-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* All-clear message */}
          {compromisedCount === 0 && (
            <p className="flex items-center gap-1.5 text-xs text-success-400">
              <CheckCircle2 size={13} />
              All passwords are clean — none have appeared in known breach databases.
            </p>
          )}
        </motion.div>
      )}

      {/* First-time prompt */}
      {!hasResults && !isChecking && !error && (
        <p className="text-center text-xs text-muted-foreground/50 py-1">
          Run a scan to check whether any stored passwords have been exposed in data breaches.
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Vault Health section (Bonus Feature)
// ---------------------------------------------------------------------------

function VaultHealth() {
  const { credentials } = useVaultStore()
  const { getReuseGroups } = useVault()
  const settings = useSettingsStore()

  const [reuseGroups, setReuseGroups] = React.useState<Map<string, { id: string; name: string }[]>>(new Map())

  React.useEffect(() => {
    if (credentials.length > 1) {
      getReuseGroups().then((groups) => {
        const simplified = new Map<string, { id: string; name: string }[]>()
        groups.forEach((creds, hash) => {
          simplified.set(hash, creds.map((c) => ({ id: c.id, name: c.name })))
        })
        setReuseGroups(simplified)
      })
    }
  }, [credentials, getReuseGroups])

  const total = credentials.length
  const weakCreds = credentials.filter((c) => c.passwordStrengthScore <= 1)
  const reuseCount = Array.from(reuseGroups.values()).reduce((a, b) => a + b.length, 0)
  const strongCount = credentials.filter((c) => c.passwordStrengthScore >= 3).length

  // Stale passwords
  const staleCreds = React.useMemo(() => {
    if (settings.passwordExpiryDays === 0) return []
    const threshold = Date.now() - settings.passwordExpiryDays * 24 * 60 * 60 * 1000
    return credentials.filter(
      (c) => c.passwordChangedAt !== undefined && c.passwordChangedAt < threshold
    )
  }, [credentials, settings.passwordExpiryDays])

  const rawScore =
    total === 0
      ? 100
      : Math.max(
          0,
          Math.round(
            100 -
              (weakCreds.length / total) * 40 -
              (reuseCount / total) * 35 -
              (staleCreds.length / total) * 25
          )
        )

  const scoreColor =
    rawScore >= 80
      ? 'text-success-400'
      : rawScore >= 60
      ? 'text-accent-400'
      : rawScore >= 40
      ? 'text-warning-400'
      : 'text-danger-400'

  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No credentials yet. Add some to see your vault health.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {/* Score */}
      <div className="flex items-center gap-4 p-4 rounded-xl border border-navy-700/30 bg-navy-900/40">
        <div className="text-center min-w-[60px]">
          <div className={`text-3xl font-bold tabular-nums ${scoreColor}`}>{rawScore}</div>
          <div className="text-xs text-muted-foreground">/ 100</div>
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{total} total credentials</span>
            <span className={scoreColor}>{rawScore >= 80 ? 'Excellent' : rawScore >= 60 ? 'Good' : rawScore >= 40 ? 'Fair' : 'Needs work'}</span>
          </div>
          <div className="h-2 rounded-full bg-navy-800 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${rawScore}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={cn(
                'h-full rounded-full',
                rawScore >= 80 ? 'bg-success-500' : rawScore >= 60 ? 'bg-accent-500' : rawScore >= 40 ? 'bg-warning-500' : 'bg-danger-500'
              )}
            />
          </div>
          <div className="grid grid-cols-4 gap-2 pt-1 text-xs">
            <div className="text-center">
              <div className="font-semibold text-success-400">{strongCount}</div>
              <div className="text-muted-foreground">Strong</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-warning-400">{weakCreds.length}</div>
              <div className="text-muted-foreground">Weak</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-danger-400">{reuseCount}</div>
              <div className="text-muted-foreground">Reused</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-orange-400">{staleCreds.length}</div>
              <div className="text-muted-foreground">Stale</div>
            </div>
          </div>
        </div>
      </div>

      {/* Weak passwords list */}
      {weakCreds.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-warning-400 flex items-center gap-1.5">
            <AlertTriangle size={12} /> Weak passwords — update these
          </p>
          <div className="space-y-1">
            {weakCreds.slice(0, 5).map((c) => (
              <Link
                key={c.id}
                href={`/vault/${c.id}`}
                className="flex items-center justify-between px-3 py-2 rounded-lg border border-navy-700/20 bg-navy-900/30 hover:bg-navy-800/40 transition-colors group"
              >
                <span className="text-sm text-foreground truncate">{c.name}</span>
                <span className="flex items-center gap-1 text-xs text-warning-400 shrink-0">
                  Fix <ChevronRight size={12} />
                </span>
              </Link>
            ))}
            {weakCreds.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                + {weakCreds.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Reused passwords list */}
      {reuseGroups.size > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-danger-400 flex items-center gap-1.5">
            <AlertTriangle size={12} /> Reused passwords — each service should be unique
          </p>
          <div className="space-y-1">
            {Array.from(reuseGroups.values()).slice(0, 3).map((group, i) => (
              <div key={i} className="flex flex-wrap gap-1 px-3 py-2 rounded-lg border border-navy-700/20 bg-navy-900/30">
                {group.map((c: { id: string; name: string }) => (
                  <Link key={c.id} href={`/vault/${c.id}`}>
                    <Badge variant="warning" className="text-xs cursor-pointer hover:opacity-80">
                      {c.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stale passwords list */}
      {staleCreds.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-orange-400 flex items-center gap-1.5">
            <Clock size={12} /> Stale passwords — not rotated in {settings.passwordExpiryDays}+ days
          </p>
          <div className="space-y-1">
            {staleCreds.slice(0, 5).map((c) => {
              const ageDays = getPasswordAgeDays(c.passwordChangedAt)
              return (
                <Link
                  key={c.id}
                  href={`/vault/${c.id}`}
                  className="flex items-center justify-between px-3 py-2 rounded-lg border border-navy-700/20 bg-navy-900/30 hover:bg-navy-800/40 transition-colors group"
                >
                  <span className="text-sm text-foreground truncate">{c.name}</span>
                  <span className="flex items-center gap-1 text-xs text-orange-400 shrink-0">
                    {ageDays !== null ? `${ageDays}d old` : ''} <ChevronRight size={12} />
                  </span>
                </Link>
              )
            })}
            {staleCreds.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                + {staleCreds.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}

      {rawScore >= 80 && weakCreds.length === 0 && reuseCount === 0 && staleCreds.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-success-400">
          <CheckCircle2 size={15} />
          Your vault is in great shape. Keep it up!
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Export section
// ---------------------------------------------------------------------------

function ExportVault() {
  const { credentials } = useVaultStore()
  const { toast } = useToast()
  const [isExporting, setIsExporting] = React.useState(false)

  function handleExport() {
    if (credentials.length === 0) {
      toast({ title: 'Vault is empty', variant: 'error' })
      return
    }

    setIsExporting(true)
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        version: 1,
        credentials: credentials.map(({ password, ...rest }) => ({
          ...rest,
          password, // Include password — this file should be stored securely
        })),
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `passmvault-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: 'Vault exported',
        variant: 'success',
        description: 'Store this file securely — it contains your plaintext credentials.',
      })
    } catch (err) {
      console.error('[Export] Failed:', err)
      toast({ title: 'Export failed', variant: 'error' })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Download a JSON backup of all credentials. Store this file in a secure location.
      </p>
      <div className="flex items-center gap-3 p-3 rounded-lg border border-warning-500/20 bg-warning-500/5">
        <AlertTriangle size={14} className="text-warning-400 shrink-0" />
        <p className="text-xs text-warning-400">
          The export contains <strong>plaintext passwords</strong>. Treat this file like a secret.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={isExporting || credentials.length === 0}
      >
        {isExporting ? (
          <><Loader2 size={13} className="animate-spin" />Exporting…</>
        ) : (
          <><Download size={13} />Export vault ({credentials.length} credentials)</>
        )}
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tag manager (categories / departments)
// ---------------------------------------------------------------------------

function TagManager({
  label,
  items,
  onAdd,
  onRemove,
  placeholder,
}: {
  label: string
  items: string[]
  onAdd: (v: string) => void
  onRemove: (v: string) => void
  placeholder: string
}) {
  const [input, setInput] = React.useState('')

  function handleAdd() {
    const trimmed = input.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setInput('')
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 rounded-md border border-navy-700/40 bg-navy-800/60 px-2 py-1 text-xs text-foreground"
          >
            {item}
            <button
              type="button"
              onClick={() => onRemove(item)}
              className="text-muted-foreground hover:text-danger-400 transition-colors"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        {items.length === 0 && (
          <span className="text-xs text-muted-foreground italic">No {label.toLowerCase()} yet</span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={placeholder}
          className="flex h-8 flex-1 rounded-lg border border-navy-700/60 bg-navy-900 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500/40"
        />
        <Button size="sm" variant="outline" onClick={handleAdd} disabled={!input.trim()}>
          <Plus size={13} />
          Add
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main settings page
// ---------------------------------------------------------------------------

const EXPIRY_OPTIONS = [
  { label: 'Disabled', value: 0 },
  { label: '30 days', value: 30 },
  { label: '60 days', value: 60 },
  { label: '90 days (recommended)', value: 90 },
  { label: '180 days', value: 180 },
  { label: '1 year', value: 365 },
]

export default function SettingsPage() {
  const settings = useSettingsStore()

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-8"
      >
        <div>
          <h1 className="text-xl font-bold text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure security, preferences, and vault behaviour.
          </p>
        </div>

        {/* 1 — Security */}
        <Section title="Security" icon={<Lock size={16} />}>
          {/* Auto-lock */}
          <div className="rounded-xl border border-navy-700/30 bg-navy-900/30 p-4 space-y-4">
            <SettingRow
              label="Auto-lock after inactivity"
              description="Vault locks automatically when you stop interacting."
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-accent-400 tabular-nums w-10 text-right">
                  {settings.autoLockMinutes}m
                </span>
                <input
                  type="range"
                  min={1}
                  max={60}
                  value={settings.autoLockMinutes}
                  onChange={(e) =>
                    settings.updateSettings({ autoLockMinutes: Number(e.target.value) })
                  }
                  className="w-24 accent-teal-500"
                />
              </div>
            </SettingRow>

            <SettingRow
              label="Lock when tab is hidden"
              description="Immediately locks the vault when you switch tabs or minimize the browser."
            >
              <SwitchToggle
                id="lock-tab"
                checked={settings.lockOnTabHidden}
                onChange={(v) => settings.updateSettings({ lockOnTabHidden: v })}
              />
            </SettingRow>

            <SettingRow
              label="Clipboard clear delay"
              description="Auto-clears copied passwords from your clipboard."
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-accent-400 tabular-nums w-10 text-right">
                  {settings.clipboardClearSeconds}s
                </span>
                <input
                  type="range"
                  min={10}
                  max={120}
                  step={5}
                  value={settings.clipboardClearSeconds}
                  onChange={(e) =>
                    settings.updateSettings({
                      clipboardClearSeconds: Number(e.target.value),
                    })
                  }
                  className="w-24 accent-teal-500"
                />
              </div>
            </SettingRow>
          </div>

          {/* Change master password */}
          <div className="rounded-xl border border-navy-700/30 bg-navy-900/30 p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Change Master Password</p>
            <ChangeMasterPassword />
          </div>
        </Section>

        {/* 2 — Vault Health */}
        <Section title="Vault Health" icon={<TrendingUp size={16} />} id="health">
          <div className="rounded-xl border border-navy-700/30 bg-navy-900/30 p-4">
            <VaultHealth />
          </div>

          {/* Breach Detection — the one feature we didn't ask for */}
          <div className="rounded-xl border border-navy-700/30 bg-navy-900/30 p-4">
            <BreachScan />
          </div>
        </Section>

        {/* 3 — Export */}
        <Section title="Export & Backup" icon={<Download size={16} />}>
          <div className="rounded-xl border border-navy-700/30 bg-navy-900/30 p-4">
            <ExportVault />
          </div>
        </Section>

        {/* 4 — Categories & Departments */}
        <Section title="Categories & Departments" icon={<Tag size={16} />}>
          <div className="rounded-xl border border-navy-700/30 bg-navy-900/30 p-4 space-y-5">
            <TagManager
              label="Categories"
              items={settings.categories}
              onAdd={settings.addCategory}
              onRemove={settings.removeCategory}
              placeholder="Add category (e.g. Finance)"
            />
            <div className="h-px bg-navy-700/30" />
            <TagManager
              label="Departments"
              items={settings.departments}
              onAdd={settings.addDepartment}
              onRemove={settings.removeDepartment}
              placeholder="Add department (e.g. Engineering)"
            />
          </div>
        </Section>

        {/* 5 — Preferences */}
        <Section title="Preferences" icon={<Settings2 size={16} />}>
          <div className="rounded-xl border border-navy-700/30 bg-navy-900/30 p-4 space-y-4">
            {/* Company name */}
            <div className="space-y-1.5">
              <label
                htmlFor="company-name"
                className="text-sm font-medium text-foreground"
              >
                Company / Team name
              </label>
              <input
                id="company-name"
                type="text"
                value={settings.companyName ?? ''}
                onChange={(e) =>
                  settings.updateSettings({ companyName: e.target.value })
                }
                placeholder="e.g. Acme Corp"
                className="flex h-9 w-full rounded-lg border border-navy-700/60 bg-navy-900 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500/40"
              />
            </div>

            {/* Reveal passwords by default */}
            <SettingRow
              label="Reveal passwords by default"
              description="Show passwords in plain text when opening a credential."
            >
              <SwitchToggle
                id="reveal-default"
                checked={settings.revealPasswordDefault}
                onChange={(v) => settings.updateSettings({ revealPasswordDefault: v })}
              />
            </SettingRow>

            {/* Password expiry */}
            <SettingRow
              label="Password rotation reminder"
              description="Flag credentials whose passwords haven't been changed in this long."
            >
              <select
                value={settings.passwordExpiryDays}
                onChange={(e) =>
                  settings.updateSettings({ passwordExpiryDays: Number(e.target.value) })
                }
                className="h-8 rounded-lg border border-navy-700/60 bg-navy-900 px-2 py-1 text-sm text-foreground focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500/40"
              >
                {EXPIRY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </SettingRow>
          </div>
        </Section>
      </motion.div>
    </div>
  )
}
