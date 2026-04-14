/**
 * /generator — Standalone password generator page.
 */

'use client'

export const dynamic = 'force-dynamic'

import { motion } from 'framer-motion'
import { Wand2 } from 'lucide-react'
import { PasswordGenerator } from '@/components/PasswordGenerator'

export default function GeneratorPage() {
  return (
    <div className="container mx-auto max-w-lg px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-6"
      >
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-navy-600 to-accent-600 shadow-glow mb-4">
            <Wand2 size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Password Generator</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate cryptographically secure passwords for any service.
          </p>
        </div>

        <PasswordGenerator />
      </motion.div>
    </div>
  )
}
