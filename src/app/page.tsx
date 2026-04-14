/**
 * page.tsx — Root lock screen.
 * Handles first-time vault setup and returning-user unlock.
 *
 * Auth model:
 *  - Firebase anonymous sign-in (auto on mount) gives us a stable userId for
 *    storing the vault in Firestore without requiring an email/password account.
 *  - A master password is derived with PBKDF2 into an AES-GCM-256 CryptoKey.
 *  - A "canary" object encrypted with that key is stored alongside the salt so
 *    we can verify the master password on subsequent unlocks without storing
 *    any secret server-side.
 */

'use client'

export const dynamic = 'force-dynamic'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  Fingerprint,
  Sparkles,
} from 'lucide-react'
import { signInAnonymously } from 'firebase/auth'
import { getDoc, setDoc } from 'firebase/firestore'
import { auth, getUserSaltRef } from '@/lib/firebase'
import {
  deriveKey,
  generateSalt,
  encryptVaultEntry,
  decryptVaultEntry,
} from '@/lib/crypto'
import { useSessionStore } from '@/store/session'
import { Button } from '@/components/ui/button'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CANARY = 'PASSMV1_VALID'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function saltToBase64(salt: Uint8Array): string {
  return btoa(String.fromCharCode(...Array.from(salt)))
}

function base64ToSalt(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64).split('').map((c) => c.charCodeAt(0)))
}

function getSetupStrength(pwd: string): { label: string; color: string; score: number } {
  if (!pwd) return { label: '', color: '', score: 0 }
  if (pwd.length < 8) return { label: 'Too short', color: 'text-danger-400', score: 1 }
  let score = 0
  if (pwd.length >= 12) score++
  if (pwd.length >= 16) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  if (score <= 1) return { label: 'Weak', color: 'text-danger-400', score: 1 }
  if (score === 2) return { label: 'Fair', color: 'text-warning-400', score: 2 }
  if (score === 3) return { label: 'Good', color: 'text-accent-400', score: 3 }
  return { label: 'Strong', color: 'text-success-400', score: 4 }
}

// ---------------------------------------------------------------------------
// Animated background dots
// ---------------------------------------------------------------------------

function BackgroundDots() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ opacity: 0.06 }}
    >
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="#818cf8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Step = 'loading' | 'setup' | 'unlock' | 'success'

export default function LockScreen() {
  const router = useRouter()
  const { unlock, isUnlocked } = useSessionStore()

  const [step, setStep] = React.useState<Step>('loading')
  const [userId, setUserId] = React.useState<string | null>(null)
  const [saltDoc, setSaltDoc] = React.useState<{ salt: string; verifier: string } | null>(null)

  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')

  const setupStrength = getSetupStrength(password)

  // Redirect if already unlocked
  React.useEffect(() => {
    if (isUnlocked) router.replace('/vault')
  }, [isUnlocked, router])

  // Initialize: anonymous sign-in + check for existing vault
  React.useEffect(() => {
    async function init() {
      try {
        const credential = await signInAnonymously(auth)
        const uid = credential.user.uid
        setUserId(uid)

        const snap = await getDoc(getUserSaltRef(uid))
        if (snap.exists()) {
          const data = snap.data() as { salt: string; verifier: string }
          setSaltDoc(data)
          setStep('unlock')
        } else {
          setStep('setup')
        }
      } catch (err) {
        console.error('[LockScreen] Init error:', err)
        setStep('setup')
      }
    }
    init()
  }, [])

  // ---------------------------------------------------------------------------
  // First-time setup
  // ---------------------------------------------------------------------------

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Master password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!userId) return

    setIsSubmitting(true)
    try {
      const salt = generateSalt()
      const key = await deriveKey(password, salt)
      const verifier = await encryptVaultEntry({ v: CANARY }, key)

      await setDoc(getUserSaltRef(userId), {
        salt: saltToBase64(salt),
        verifier,
      })

      unlock(key, userId, null, salt)
      setStep('success')
      setTimeout(() => router.push('/vault'), 2200)
    } catch (err) {
      console.error('[LockScreen] Setup failed:', err)
      setError('Failed to create vault. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Unlock
  // ---------------------------------------------------------------------------

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!userId || !saltDoc) return

    setIsSubmitting(true)
    try {
      const salt = base64ToSalt(saltDoc.salt)
      const key = await deriveKey(password, salt)
      const result = (await decryptVaultEntry(saltDoc.verifier, key)) as { v: string }
      if (result.v !== CANARY) throw new Error('Canary mismatch')

      unlock(key, userId, null, salt)
      router.push('/vault')
    } catch {
      setError('Incorrect master password. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse 120% 80% at 50% 0%, hsl(243 60% 10%) 0%, hsl(240 20% 4%) 60%, hsl(240 15% 3%) 100%)',
      }}
    >
      {/* Background dot grid */}
      <BackgroundDots />

      {/* Ambient glow — top center */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      {/* Ambient glow — bottom */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 left-1/2 -translate-x-1/2 h-64 w-[600px]"
        style={{
          background: 'radial-gradient(ellipse, rgba(20,184,166,0.08) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <main className="relative z-10 w-full max-w-md px-4 py-8 sm:py-16">
        <AnimatePresence mode="wait">

          {/* Loading state */}
          {step === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-20"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-navy-500 to-accent-600 shadow-glow">
                <ShieldCheck size={28} className="text-white" />
              </div>
              <Loader2 size={18} className="animate-spin text-muted-foreground" />
            </motion.div>
          )}

          {/* Success modal */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.88, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -16 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-6"
            >
              <div className="relative flex items-center justify-center">
                {/* Pulsing glow ring */}
                <motion.div
                  animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute h-28 w-28 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.35) 0%, transparent 70%)' }}
                />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-success-500/20 to-accent-600/20 border border-success-500/30 shadow-[0_0_40px_rgba(20,184,166,0.25)]">
                  <motion.div
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 18 }}
                  >
                    <CheckCircle2 size={40} className="text-success-400" />
                  </motion.div>
                </div>
              </div>

              <div className="rounded-2xl border border-navy-700/40 bg-[hsl(240_12%_7%/0.90)] px-8 py-8 shadow-[0_8px_48px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl w-full text-center space-y-3">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} className="text-accent-400" />
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    Vault Created!
                  </h2>
                  <Sparkles size={16} className="text-accent-400" />
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-sm text-muted-foreground leading-relaxed"
                >
                  Your encrypted vault is ready. All credentials are protected
                  with AES-256 and never leave your device.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  className="pt-2"
                >
                  <Button
                    variant="accent"
                    size="lg"
                    className="w-full"
                    onClick={() => router.push('/vault')}
                  >
                    <KeyRound size={16} />
                    Enter Vault
                  </Button>
                  <p className="mt-3 text-xs text-muted-foreground/40">
                    Redirecting automatically…
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Setup / Unlock form */}
          {(step === 'setup' || step === 'unlock') && (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              {/* Logo + heading */}
              <div className="flex flex-col items-center text-center gap-4">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 280,
                    damping: 20,
                    delay: 0.06,
                  }}
                  className="relative"
                >
                  {/* Glow ring around icon */}
                  <div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      boxShadow: '0 0 32px rgba(99,102,241,0.35)',
                      borderRadius: '16px',
                    }}
                  />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-navy-500 via-navy-600 to-accent-600">
                    {step === 'unlock' ? (
                      <Lock size={28} className="text-white" />
                    ) : (
                      <ShieldCheck size={28} className="text-white" />
                    )}
                  </div>
                </motion.div>

                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    Pass<span className="text-accent-400">M</span>
                  </h1>
                  <p className="mt-1.5 text-sm text-muted-foreground max-w-xs mx-auto">
                    {step === 'setup'
                      ? 'Create a master password to protect your team\u2019s credentials.'
                      : 'Your vault is locked. Enter your master password to continue.'}
                  </p>
                </div>
              </div>

              {/* Card */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="rounded-2xl border border-navy-700/40 bg-[hsl(240_12%_7%/0.90)] p-6 shadow-[0_8px_48px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl"
              >
                <form
                  onSubmit={step === 'setup' ? handleSetup : handleUnlock}
                  className="space-y-4"
                  noValidate
                >
                  {/* Password field */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="master-pwd"
                      className="text-sm font-medium text-foreground/90"
                    >
                      Master Password
                    </label>
                    <div className="relative">
                      <input
                        id="master-pwd"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value)
                          setError('')
                        }}
                        placeholder={
                          step === 'setup'
                            ? 'Create a strong master password'
                            : 'Enter your master password'
                        }
                        autoComplete={
                          step === 'setup' ? 'new-password' : 'current-password'
                        }
                        autoFocus
                        className="flex h-11 w-full rounded-xl border border-navy-700/50 bg-navy-900/80 px-4 pr-11 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all focus:border-accent-500/70 focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:bg-navy-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 transition-colors hover:text-foreground"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {/* Strength bar (setup only) */}
                    {step === 'setup' && password.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex items-center gap-2 pt-1"
                      >
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((n) => (
                            <div
                              key={n}
                              className={[
                                'h-1 w-8 rounded-full transition-all duration-300',
                                n <= setupStrength.score
                                  ? setupStrength.score >= 4
                                    ? 'bg-success-500'
                                    : setupStrength.score >= 3
                                    ? 'bg-accent-500'
                                    : setupStrength.score >= 2
                                    ? 'bg-warning-500'
                                    : 'bg-danger-500'
                                  : 'bg-navy-800',
                              ].join(' ')}
                            />
                          ))}
                        </div>
                        <span className={`text-xs font-medium ${setupStrength.color}`}>
                          {setupStrength.label}
                        </span>
                      </motion.div>
                    )}
                  </div>

                  {/* Confirm password (setup only) */}
                  {step === 'setup' && (
                    <div className="space-y-1.5">
                      <label
                        htmlFor="confirm-pwd"
                        className="text-sm font-medium text-foreground/90"
                      >
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          id="confirm-pwd"
                          type={showConfirm ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value)
                            setError('')
                          }}
                          placeholder="Confirm your master password"
                          autoComplete="new-password"
                          className="flex h-11 w-full rounded-xl border border-navy-700/50 bg-navy-900/80 px-4 pr-11 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all focus:border-accent-500/70 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm((v) => !v)}
                          aria-label={showConfirm ? 'Hide' : 'Show'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 transition-colors hover:text-foreground"
                        >
                          {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      {/* Match indicator */}
                      {confirmPassword.length > 0 && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex items-center gap-1.5 text-xs font-medium ${
                            password === confirmPassword
                              ? 'text-success-400'
                              : 'text-danger-400'
                          }`}
                        >
                          {password === confirmPassword ? (
                            <><CheckCircle2 size={12} />Passwords match</>
                          ) : (
                            <><AlertCircle size={12} />Passwords do not match</>
                          )}
                        </motion.p>
                      )}
                    </div>
                  )}

                  {/* Error message */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-2 rounded-xl bg-danger-400/10 border border-danger-400/20 px-3 py-2.5 text-sm text-danger-400"
                      >
                        <AlertCircle size={14} className="shrink-0" />
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit button */}
                  <Button
                    type="submit"
                    variant="accent"
                    size="lg"
                    className="w-full mt-1"
                    disabled={
                      isSubmitting ||
                      !password ||
                      (step === 'setup' && !confirmPassword)
                    }
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        {step === 'setup' ? 'Creating vault…' : 'Unlocking…'}
                      </>
                    ) : step === 'setup' ? (
                      <><KeyRound size={16} />Create Vault</>
                    ) : (
                      <><Fingerprint size={16} />Unlock Vault</>
                    )}
                  </Button>
                </form>

                <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground/40">
                  {step === 'setup'
                    ? 'Your master password encrypts all data client-side and never leaves your device.'
                    : 'Zero-knowledge — credentials are never transmitted in plain text.'}
                </p>
              </motion.div>

              {/* Feature pills */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="flex flex-wrap items-center justify-center gap-2"
              >
                {['AES-256 Encrypted', 'Zero Knowledge', 'Auto-Lock'].map((f) => (
                  <span
                    key={f}
                    className="rounded-full border border-navy-700/40 bg-navy-900/20 px-3 py-1 text-xs text-muted-foreground/40 backdrop-blur-sm"
                  >
                    {f}
                  </span>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
