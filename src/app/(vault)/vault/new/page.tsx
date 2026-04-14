/**
 * /vault/new — Add a new credential to the vault.
 */

'use client'

export const dynamic = 'force-dynamic'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useVault } from '@/hooks/useVault'
import { useSessionStore } from '@/store/session'
import { CredentialForm } from '@/components/CredentialForm'
import { useToast } from '@/components/ui/use-toast'
import type { CredentialFormValues } from '@/components/CredentialForm'

export default function NewCredentialPage() {
  const router = useRouter()
  const { saveCredential } = useVault()
  const { cryptoKey, userId } = useSessionStore()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  async function handleSubmit(
    values: CredentialFormValues & { passwordStrengthScore: number }
  ) {
    if (!cryptoKey || !userId) return

    setIsSubmitting(true)
    try {
      const now = Date.now()
      await saveCredential(
        {
          ...values,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          // passwordChangedAt comes from form values (set to now for new credentials)
          passwordChangedAt: values.passwordChangedAt ?? now,
        },
        cryptoKey,
        userId
      )
      toast({ title: 'Credential saved', variant: 'success' })
      router.push('/vault')
    } catch (err) {
      console.error('[NewCredential] Save failed:', err)
      toast({ title: 'Failed to save', variant: 'error' })
    } finally {
      setIsSubmitting(false)
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
        {/* Back link + heading */}
        <div>
          <Link
            href="/vault"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft size={14} />
            Back to vault
          </Link>
          <h1 className="text-xl font-bold text-foreground">Add Credential</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All fields are encrypted before being stored.
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-xl border border-navy-700/30 bg-[hsl(240_10%_6%/0.7)] p-5 sm:p-6 backdrop-blur-sm">
          <CredentialForm
            onSubmit={handleSubmit}
            onCancel={() => router.push('/vault')}
            isSubmitting={isSubmitting}
            submitLabel="Add to vault"
          />
        </div>
      </motion.div>
    </div>
  )
}
