'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'

// ---------------------------------------------------------------------------
// Animated SVG illustration
// ---------------------------------------------------------------------------

function ShieldIllustration() {
  return (
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      className="relative"
    >
      <svg
        width="120"
        height="140"
        viewBox="0 0 120 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Shield body */}
        <motion.path
          d="M60 8 L104 26 L104 68 C104 96 84 118 60 128 C36 118 16 96 16 68 L16 26 Z"
          fill="url(#shieldGrad)"
          stroke="url(#borderGrad)"
          strokeWidth="1.5"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />

        {/* Inner shield highlight */}
        <path
          d="M60 18 L96 33 L96 68 C96 91 79 110 60 119 C41 110 24 91 24 68 L24 33 Z"
          fill="url(#innerGrad)"
          opacity="0.4"
        />

        {/* Lock body */}
        <motion.rect
          x="44" y="68" width="32" height="26" rx="4"
          fill="url(#lockGrad)"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        />

        {/* Lock shackle */}
        <motion.path
          d="M50 68 L50 60 C50 51.2 70 51.2 70 60 L70 68"
          stroke="url(#lockGrad)"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5, ease: 'easeOut' }}
        />

        {/* Keyhole */}
        <motion.circle
          cx="60" cy="79" r="4"
          fill="hsl(240 10% 8%)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        />
        <motion.rect
          x="58" y="80" width="4" height="7" rx="1"
          fill="hsl(240 10% 8%)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        />

        {/* Sparkles */}
        {[
          { cx: 22, cy: 32, r: 2.5, delay: 0.9 },
          { cx: 98, cy: 44, r: 2, delay: 1.1 },
          { cx: 14, cy: 76, r: 1.8, delay: 1.3 },
          { cx: 106, cy: 82, r: 1.5, delay: 1.0 },
        ].map((s, i) => (
          <motion.circle
            key={i}
            cx={s.cx}
            cy={s.cy}
            r={s.r}
            fill="#14b8a6"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
            transition={{
              delay: s.delay,
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1.5,
            }}
          />
        ))}

        <defs>
          <linearGradient id="shieldGrad" x1="60" y1="8" x2="60" y2="128" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#312e81" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </linearGradient>
          <linearGradient id="borderGrad" x1="16" y1="8" x2="104" y2="128" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="innerGrad" x1="60" y1="18" x2="60" y2="119" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#5eead4" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="lockGrad" x1="44" y1="55" x2="76" y2="94" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#a5b4fc" />
            <stop offset="100%" stopColor="#5eead4" />
          </linearGradient>
        </defs>
      </svg>

      {/* Glow ring */}
      <div
        className="absolute inset-0 rounded-full opacity-20 blur-xl"
        style={{ background: 'radial-gradient(ellipse, #6366f1 0%, transparent 70%)' }}
      />
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

export interface EmptyStateProps {
  heading?: string
  subtext?: string
  ctaHref?: string
  ctaLabel?: string
  className?: string
}

export function EmptyState({
  heading = 'Your vault is empty',
  subtext = 'Add your first credential to get started',
  ctaHref = '/vault/new',
  ctaLabel = 'Add credential',
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'flex flex-col items-center justify-center gap-6 py-20 px-4 text-center',
        className
      )}
    >
      {/* Illustration */}
      <ShieldIllustration />

      {/* Copy */}
      <div className="space-y-2 max-w-xs">
        <h2 className="text-xl font-semibold text-foreground">{heading}</h2>
        <p className="text-sm text-muted-foreground">{subtext}</p>
      </div>

      {/* CTA */}
      <Button variant="default" size="lg" asChild>
        <Link href={ctaHref}>
          <Plus size={16} />
          {ctaLabel}
        </Link>
      </Button>
    </motion.div>
  )
}
