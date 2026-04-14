'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { getStrength, getStrengthForVault } from '@/lib/strength'
import { cn } from '@/components/ui/cn'

export interface StrengthBarProps {
  /** Raw password string — getStrength() will be called on it */
  password?: string
  /** Pre-computed zxcvbn score (0-4). Used when password is not available. */
  score?: number
  showLabel?: boolean
  className?: string
}

export function StrengthBar({
  password,
  score,
  showLabel = true,
  className,
}: StrengthBarProps) {
  const result = React.useMemo(() => {
    if (password !== undefined) return getStrength(password)
    if (score !== undefined) return getStrengthForVault(score)
    return getStrength('')
  }, [password, score])

  const segmentCount = 4
  const filledSegments = result.score // 0-4

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {/* Segmented bar */}
      <div className="flex gap-1 h-1.5" role="meter" aria-valuemin={0} aria-valuemax={4} aria-valuenow={result.score} aria-label={`Password strength: ${result.label}`}>
        {Array.from({ length: segmentCount }).map((_, i) => {
          const filled = i < filledSegments
          return (
            <div
              key={i}
              className="flex-1 rounded-full overflow-hidden bg-navy-800/60"
            >
              <motion.div
                className="h-full w-full rounded-full"
                initial={false}
                animate={{
                  scaleX: filled ? 1 : 0,
                  backgroundColor: result.bgColor
                    ? undefined
                    : 'transparent',
                }}
                style={{
                  originX: 0,
                  backgroundColor: filled
                    ? getSegmentColor(result.score)
                    : 'transparent',
                }}
                transition={{
                  scaleX: {
                    type: 'spring',
                    stiffness: 300,
                    damping: 28,
                    delay: i * 0.04,
                  },
                  backgroundColor: { duration: 0.4 },
                }}
              />
            </div>
          )
        })}
      </div>

      {/* Label */}
      {showLabel && (
        <motion.p
          key={result.label}
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={cn('text-xs font-medium', result.color)}
        >
          {result.label}
        </motion.p>
      )}
    </div>
  )
}

/** Returns a hex color matching zxcvbn score for smooth Framer Motion interpolation */
function getSegmentColor(score: 0 | 1 | 2 | 3 | 4): string {
  const colors: Record<0 | 1 | 2 | 3 | 4, string> = {
    0: '#ef4444',
    1: '#f97316',
    2: '#eab308',
    3: '#14b8a6',
    4: '#22c55e',
  }
  return colors[score]
}
