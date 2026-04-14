'use client'

import * as React from 'react'
import { cn } from '@/components/ui/cn'

// ---------------------------------------------------------------------------
// Card root
// ---------------------------------------------------------------------------

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // Shape & spacing
      'rounded-vault-card',
      // Glass-morphism dark background
      'bg-gradient-to-br from-[hsl(240_10%_7%/0.92)] to-[hsl(240_10%_5%/0.97)]',
      'backdrop-blur-xl',
      // Border
      'border border-navy-700/30',
      // Shadow layers
      'shadow-[0_0_0_1px_rgba(99,102,241,0.07),0_4px_24px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.04)]',
      // Transition for interactive variants
      'transition-all duration-200',
      className
    )}
    {...props}
  />
))
Card.displayName = 'Card'

// ---------------------------------------------------------------------------
// CardHeader
// ---------------------------------------------------------------------------

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
))
CardHeader.displayName = 'CardHeader'

// ---------------------------------------------------------------------------
// CardTitle
// ---------------------------------------------------------------------------

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-tight tracking-tight text-foreground',
      className
    )}
    {...props}
  />
))
CardTitle.displayName = 'CardTitle'

// ---------------------------------------------------------------------------
// CardDescription
// ---------------------------------------------------------------------------

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
CardDescription.displayName = 'CardDescription'

// ---------------------------------------------------------------------------
// CardContent
// ---------------------------------------------------------------------------

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('p-6 pt-0', className)}
    {...props}
  />
))
CardContent.displayName = 'CardContent'

// ---------------------------------------------------------------------------
// CardFooter
// ---------------------------------------------------------------------------

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center p-6 pt-0',
      // Subtle top separator
      'border-t border-navy-700/20 mt-2 pt-4',
      className
    )}
    {...props}
  />
))
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
