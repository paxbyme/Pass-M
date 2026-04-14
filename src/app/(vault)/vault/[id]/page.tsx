/**
 * /vault/[id] — View and edit an existing credential.
 * Loads the credential from the vault store, shows a pre-filled form,
 * and provides a delete option with inline confirmation.
 */

'use client'

export const dynamic = 'force-dynamic'

import * as React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Trash2, AlertTriangle, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { useVault } from '@/hooks/useVault'
import { useVaultStore } from '@/store/vault'
import { useSessionStore } from '@/store/session'
import { useBreachStore } from '@/store/breach'
import { CredentialForm } from '@/components/CredentialForm'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import type { CredentialFormValues } from '@/components/CredentialForm'

export default function EditCredentialPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { saveCredential, deleteCredential } = useVault()
  const { credentials } = useVaultStore()
  const { cryptoKey, userId } = useSessionStore()
  const { toast } = useToast()

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)

  const credential = credentials.find((c) => c.id === params.id)

  const breachResults = useBreachStore((s) => s.results)
  const breachLastChecked = useBreachStore((s) => s.lastChecked)
  const breachCount = breachResults[params.id] ?? 0
  const isBreached = breachLastChecked !== null && breachCount > 0

  // Guard: if credential not found (e.g. direct URL access before vault loads)
  if (!credential) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <Link
          href="/vault"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          Back to vault
        </Link>
        <div className="mt-8 text-center text-muted-foreground text-sm">
          Credential not found. It may have been deleted or the vault hasn&apos;t loaded yet.
        </div>
      </div>
    )
  }

  async function handleSubmit(
    values: CredentialFormValues & { passwordStrengthScore: number }
  ) {
    if (!cryptoKey || !userId || !credential) return
    setIsSubmitting(true)
    try {
      await saveCredential(
        {
          ...values,
          id: credential.id,
          createdAt: credential.createdAt,
          updatedAt: Date.now(),
        },
        cryptoKey,
        userId
      )
      toast({ title: 'Credential updated', variant: 'success' })
      router.push('/vault')
    } catch (err) {
      console.error('[EditCredential] Save failed:', err)
      toast({ title: 'Failed to save', variant: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!userId || !credential) return
    setIsDeleting(true)
    try {
      await deleteCredential(credential.id, userId)
      toast({ title: 'Credential deleted', variant: 'success' })
      router.push('/vault')
    } catch (err) {
      console.error('[EditCredential] Delete failed:', err)
      toast({ title: 'Failed to delete', variant: 'error' })
      setIsDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link
              href="/vault"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft size={14} />
              Back to vault
            </Link>
            <h1 className="text-xl font-bold text-foreground truncate">
              {credential.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Last updated {new Date(credential.updatedAt).toLocaleDateString()}
            </p>
          </div>

          {/* Delete button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            className="shrink-0 text-muted-foreground hover:text-danger-400 hover:bg-danger-400/10"
          >
            <Trash2 size={14} />
            Delete
          </Button>
        </div>

        {/* Breach warning */}
        <AnimatePresence>
          {isBreached && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-start gap-3 rounded-xl border border-danger-500/35 bg-danger-500/8 px-4 py-3"
            >
              <ShieldAlert size={16} className="shrink-0 text-danger-400 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-danger-400">Password compromised in a data breach</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  This password has appeared{' '}
                  <span className="font-medium text-foreground">
                    {breachCount.toLocaleString()} time{breachCount !== 1 ? 's' : ''}
                  </span>{' '}
                  in known breach databases. Replace it with a new, unique password immediately.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete confirmation */}
        <AnimatePresence>
          {confirmDelete && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 rounded-xl border border-danger-500/30 bg-danger-500/8 px-4 py-3"
            >
              <AlertTriangle size={16} className="shrink-0 text-danger-400" />
              <p className="flex-1 text-sm text-foreground">
                Delete <span className="font-semibold">{credential.name}</span>? This cannot be undone.
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmDelete(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting…' : 'Delete'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form card */}
        <div className="rounded-xl border border-navy-700/30 bg-[hsl(240_10%_6%/0.7)] p-5 sm:p-6 backdrop-blur-sm">
          <CredentialForm
            initialValues={credential}
            onSubmit={handleSubmit}
            onCancel={() => router.push('/vault')}
            isSubmitting={isSubmitting}
            submitLabel="Save changes"
          />
        </div>
      </motion.div>
    </div>
  )
}
