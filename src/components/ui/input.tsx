'use client'

import * as React from 'react'
import { cn } from '@/components/ui/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Optional leading icon rendered inside the left edge of the input */
  leftIcon?: React.ReactNode
  /** Optional trailing element rendered inside the right edge of the input */
  rightElement?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, leftIcon, rightElement, ...props }, ref) => {
    if (leftIcon || rightElement) {
      return (
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3 flex items-center text-muted-foreground">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            type={type}
            className={cn(
              // Layout & sizing
              'flex h-9 w-full rounded-lg px-3 py-2 text-sm',
              // Dark background palette
              'bg-navy-900 border border-navy-700/60',
              'text-foreground placeholder:text-muted-foreground',
              // Focus ring
              'transition-colors duration-150',
              'focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/40',
              // Disabled
              'disabled:cursor-not-allowed disabled:opacity-50',
              // File input reset
              'file:border-0 file:bg-transparent file:text-sm file:font-medium',
              // Icon padding adjustments
              leftIcon && 'pl-9',
              rightElement && 'pr-10',
              className
            )}
            {...props}
          />
          {rightElement && (
            <span className="absolute right-1 flex items-center">
              {rightElement}
            </span>
          )}
        </div>
      )
    }

    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'flex h-9 w-full rounded-lg px-3 py-2 text-sm',
          'bg-navy-900 border border-navy-700/60',
          'text-foreground placeholder:text-muted-foreground',
          'transition-colors duration-150',
          'focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/40',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
