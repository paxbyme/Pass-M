'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/components/ui/cn'

const badgeVariants = cva(
  [
    'inline-flex items-center gap-1',
    'rounded-full px-2.5 py-0.5',
    'text-xs font-medium',
    'transition-colors duration-150',
    'border',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-navy-600/30 text-navy-300 border-navy-600/40',
          'hover:bg-navy-600/50',
        ],
        secondary: [
          'bg-secondary/50 text-secondary-foreground border-secondary/60',
          'hover:bg-secondary/70',
        ],
        destructive: [
          'bg-danger-500/15 text-danger-400 border-danger-500/30',
          'hover:bg-danger-500/25',
        ],
        success: [
          'bg-success-500/15 text-success-400 border-success-500/30',
          'hover:bg-success-500/25',
        ],
        warning: [
          'bg-warning-500/15 text-warning-400 border-warning-500/30',
          'hover:bg-warning-500/25',
        ],
        outline: [
          'bg-transparent text-foreground border-navy-700/60',
          'hover:bg-white/5',
        ],
        accent: [
          'bg-accent-500/15 text-accent-400 border-accent-500/30',
          'hover:bg-accent-500/25',
        ],
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
