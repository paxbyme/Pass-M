/**
 * CredentialForm — Shared form used by both /vault/new and /vault/[id].
 * Handles all credential fields with inline password generator and strength bar.
 */

'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wand2,
  ChevronDown,
  ChevronUp,
  Globe,
  User,
  StickyNote,
  Tag,
  Folder,
  Building2,
} from 'lucide-react'
import { cn } from '@/components/ui/cn'
import { Button } from '@/components/ui/button'
import { PasswordField } from '@/components/PasswordField'
import { PasswordGenerator } from '@/components/PasswordGenerator'
import { TagInput } from '@/components/TagInput'
import { useSettingsStore } from '@/store/settings'
import { getStrength } from '@/lib/strength'
import type { Credential } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CredentialFormValues = Omit<Credential, 'id' | 'createdAt' | 'updatedAt' | 'passwordStrengthScore'>

export interface CredentialFormProps {
  initialValues?: Partial<Credential>
  onSubmit: (values: CredentialFormValues & { passwordStrengthScore: number }) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  submitLabel?: string
}

// ---------------------------------------------------------------------------
// Label + input helpers
// ---------------------------------------------------------------------------

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
      {children}
    </label>
  )
}

function TextInput({
  id,
  name,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  icon,
  error,
}: {
  id?: string
  name?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  icon?: React.ReactNode
  error?: string
}) {
  return (
    <div className="space-y-1">
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </span>
        )}
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className={cn(
            'flex h-9 w-full rounded-lg border bg-navy-900 py-2 text-sm text-foreground',
            'placeholder:text-muted-foreground transition-colors',
            'focus:outline-none focus:ring-1',
            icon ? 'pl-9 pr-3' : 'px-3',
            error
              ? 'border-danger-500/70 focus:border-danger-500 focus:ring-danger-500/30'
              : 'border-navy-700/60 focus:border-accent-500 focus:ring-accent-500/40'
          )}
        />
      </div>
      {error && <p className="text-xs text-danger-400">{error}</p>}
    </div>
  )
}

function SelectInput({
  id,
  value,
  onChange,
  options,
  placeholder,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-9 w-full appearance-none rounded-lg border border-navy-700/60 bg-navy-900 px-3 py-2 text-sm text-foreground transition-colors focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500/40"
    >
      <option value="">{placeholder ?? 'Select…'}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}

// ---------------------------------------------------------------------------
// CredentialForm
// ---------------------------------------------------------------------------

export function CredentialForm({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = 'Save',
}: CredentialFormProps) {
  const { categories, departments } = useSettingsStore()

  // Form state
  const [name, setName] = React.useState(initialValues?.name ?? '')
  const [url, setUrl] = React.useState(initialValues?.url ?? '')
  const [username, setUsername] = React.useState(initialValues?.username ?? '')
  const [password, setPassword] = React.useState(initialValues?.password ?? '')
  const [notes, setNotes] = React.useState(initialValues?.notes ?? '')
  const [tags, setTags] = React.useState<string[]>(initialValues?.tags ?? [])
  const [category, setCategory] = React.useState(initialValues?.category ?? '')
  const [department, setDepartment] = React.useState(initialValues?.department ?? '')
  const [showGenerator, setShowGenerator] = React.useState(false)

  // Track original password to detect changes for expiry tracking
  const initialPassword = React.useRef(initialValues?.password ?? '')

  // Validation
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  // All known tags as suggestions (empty here — could be extended to cross-vault tags)
  const tagSuggestions = React.useMemo(() => {
    return ['api', 'production', 'staging', 'shared', 'admin', 'readonly', 'client']
  }, [])

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Service name is required.'
    if (!username.trim()) e.username = 'Username is required.'
    if (!password) e.password = 'Password is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const strengthScore = getStrength(password).score

    // Determine passwordChangedAt:
    // - New credential (no initialValues): set to now
    // - Editing: if password changed, set to now; else preserve original timestamp
    const passwordChangedAt =
      !initialValues
        ? Date.now()
        : password !== initialPassword.current
        ? Date.now()
        : initialValues.passwordChangedAt

    await onSubmit({
      name: name.trim(),
      url: url.trim(),
      username: username.trim(),
      password,
      notes: notes.trim() || undefined,
      tags,
      category,
      department: department || undefined,
      faviconUrl: undefined,
      lastAccessedAt: undefined,
      passwordStrengthScore: strengthScore,
      passwordChangedAt,
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">

      {/* Service name */}
      <div className="space-y-1.5">
        <FieldLabel htmlFor="cred-name">Service Name <span className="text-danger-400">*</span></FieldLabel>
        <TextInput
          id="cred-name"
          value={name}
          onChange={(v) => { setName(v); setErrors((p) => ({ ...p, name: '' })) }}
          placeholder="e.g. GitHub, AWS, Salesforce"
          required
          error={errors.name}
        />
      </div>

      {/* URL */}
      <div className="space-y-1.5">
        <FieldLabel htmlFor="cred-url">URL</FieldLabel>
        <TextInput
          id="cred-url"
          value={url}
          onChange={setUrl}
          placeholder="https://github.com"
          type="url"
          icon={<Globe size={14} />}
        />
      </div>

      {/* Username */}
      <div className="space-y-1.5">
        <FieldLabel htmlFor="cred-user">Username / Email <span className="text-danger-400">*</span></FieldLabel>
        <TextInput
          id="cred-user"
          value={username}
          onChange={(v) => { setUsername(v); setErrors((p) => ({ ...p, username: '' })) }}
          placeholder="user@company.com"
          icon={<User size={14} />}
          required
          error={errors.username}
        />
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <FieldLabel htmlFor="cred-pwd">Password <span className="text-danger-400">*</span></FieldLabel>
          <button
            type="button"
            onClick={() => setShowGenerator((v) => !v)}
            className="flex items-center gap-1 text-xs text-accent-400 hover:text-accent-300 transition-colors"
          >
            <Wand2 size={12} />
            {showGenerator ? 'Hide generator' : 'Generate'}
            {showGenerator ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>

        <PasswordField
          id="cred-pwd"
          value={password}
          onChange={(v) => { setPassword(v); setErrors((p) => ({ ...p, password: '' })) }}
          showStrength
          showReveal
          showCopy
          error={errors.password}
          placeholder="Enter or generate a password"
        />

        {/* Inline password generator */}
        <AnimatePresence>
          {showGenerator && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-2">
                <PasswordGenerator
                  embedded
                  onUse={(pwd) => {
                    setPassword(pwd)
                    setShowGenerator(false)
                    setErrors((p) => ({ ...p, password: '' }))
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Category + Department row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <FieldLabel htmlFor="cred-cat">
            <span className="flex items-center gap-1.5"><Folder size={13} />Category</span>
          </FieldLabel>
          <SelectInput
            id="cred-cat"
            value={category}
            onChange={setCategory}
            options={categories}
            placeholder="No category"
          />
        </div>
        {departments.length > 0 && (
          <div className="space-y-1.5">
            <FieldLabel htmlFor="cred-dept">
              <span className="flex items-center gap-1.5"><Building2 size={13} />Department</span>
            </FieldLabel>
            <SelectInput
              id="cred-dept"
              value={department}
              onChange={setDepartment}
              options={departments}
              placeholder="No department"
            />
          </div>
        )}
        {departments.length === 0 && <div />}
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <FieldLabel>
          <span className="flex items-center gap-1.5"><Tag size={13} />Tags</span>
        </FieldLabel>
        <TagInput
          tags={tags}
          onChange={setTags}
          suggestions={tagSuggestions}
          placeholder="Add tag (press Enter or comma)"
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <FieldLabel htmlFor="cred-notes">
          <span className="flex items-center gap-1.5"><StickyNote size={13} />Notes</span>
        </FieldLabel>
        <textarea
          id="cred-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes, 2FA backup codes, etc."
          rows={3}
          className="flex w-full resize-none rounded-lg border border-navy-700/60 bg-navy-900 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500/40"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          variant="accent"
          disabled={isSubmitting}
          className="flex-1 sm:flex-none"
        >
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
