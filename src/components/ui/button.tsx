'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/components/ui/cn'

const buttonVariants = cva(
  // Base styles shared by every variant
  [
    'inline-flex items-center justify-center gap-2',
    'whitespace-nowrap rounded-lg text-sm font-semibold',
    'ring-offset-background transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'select-none',
  ],
  {
    variants: {
      variant: {
        // Navy gradient — primary CTA
        default: [
          'text-white',
          'bg-gradient-to-br from-navy-500 to-navy-600',
          'shadow-[0_2px_8px_rgba(99,102,241,0.30)]',
          'hover:from-navy-400 hover:to-navy-500',
          'hover:shadow-[0_4px_16px_rgba(99,102,241,0.45)]',
          'hover:-translate-y-px',
          'active:translate-y-0 active:shadow-[0_1px_4px_rgba(99,102,241,0.30)]',
        ],
        // Teal accent
        accent: [
          'text-white',
          'bg-gradient-to-br from-accent-500 to-accent-600',
          'shadow-[0_2px_8px_rgba(20,184,166,0.30)]',
          'hover:from-accent-400 hover:to-accent-500',
          'hover:shadow-[0_4px_16px_rgba(20,184,166,0.45)]',
          'hover:-translate-y-px',
          'active:translate-y-0',
        ],
        // Red destructive
        destructive: [
          'text-white',
          'bg-gradient-to-br from-danger-500 to-danger-600',
          'shadow-[0_2px_8px_rgba(239,68,68,0.25)]',
          'hover:from-danger-400 hover:to-danger-500',
          'hover:shadow-[0_4px_16px_rgba(239,68,68,0.40)]',
          'hover:-translate-y-px',
          'active:translate-y-0',
        ],
        // Outlined — visible border, transparent bg
        outline: [
          'border border-navy-600/60 bg-transparent text-foreground',
          'hover:bg-navy-800/50 hover:border-navy-500/80',
          'active:bg-navy-800/80',
        ],
        // Ghost — no border, subtle hover
        ghost: [
          'bg-transparent text-muted-foreground',
          'hover:bg-white/5 hover:text-foreground',
          'active:bg-white/10',
        ],
        // Muted secondary
        secondary: [
          'bg-secondary text-secondary-foreground',
          'hover:bg-secondary/80',
        ],
        link: [
          'text-accent-400 underline-offset-4 hover:underline',
          'bg-transparent p-0 h-auto',
        ],
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-md',
        default: 'h-9 px-4 py-2',
        lg: 'h-11 px-6 text-base',
        xl: 'h-12 px-8 text-base',
        icon: 'h-9 w-9 p-0',
        'icon-sm': 'h-7 w-7 p-0 rounded-md',
        'icon-lg': 'h-11 w-11 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    // asChild pattern: when true, render children as the root element
    if (asChild && React.isValidElement(props.children)) {
      const child = props.children as React.ReactElement<
        React.HTMLAttributes<HTMLElement> & { href?: string }
      >
      return React.cloneElement(child, {
        ...props,
        className: cn(buttonVariants({ variant, size, className }), child.props.className),
      })
    }
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
