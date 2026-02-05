'use client'

import { cn } from '@/lib/utils'
import { type HTMLAttributes, type ReactNode } from 'react'

// Fade In animation wrapper
interface FadeInProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  delay?: number
  duration?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
}

export function FadeIn({
  children,
  delay = 0,
  duration = 300,
  direction = 'up',
  className,
  ...props
}: FadeInProps) {
  const directionClasses = {
    up: 'animate-in fade-in slide-in-from-bottom-4',
    down: 'animate-in fade-in slide-in-from-top-4',
    left: 'animate-in fade-in slide-in-from-right-4',
    right: 'animate-in fade-in slide-in-from-left-4',
    none: 'animate-in fade-in',
  }

  return (
    <div
      className={cn(directionClasses[direction], className)}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: `${duration}ms`,
        animationFillMode: 'both',
      }}
      {...props}
    >
      {children}
    </div>
  )
}

// Stagger children animation
interface StaggerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  staggerDelay?: number
  initialDelay?: number
}

export function Stagger({
  children,
  staggerDelay = 50,
  initialDelay = 0,
  className,
  ...props
}: StaggerProps) {
  return (
    <div className={cn('contents', className)} {...props}>
      {Array.isArray(children)
        ? children.map((child, index) => (
            <FadeIn key={index} delay={initialDelay + index * staggerDelay}>
              {child}
            </FadeIn>
          ))
        : children}
    </div>
  )
}

// Pulse animation for loading indicators
interface PulseProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  color?: string
}

export function Pulse({
  children,
  size = 'md',
  color = 'bg-blue-500',
  className,
  ...props
}: PulseProps) {
  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  }

  if (children) {
    return (
      <div className={cn('animate-pulse', className)} {...props}>
        {children}
      </div>
    )
  }

  return (
    <div
      className={cn('rounded-full animate-pulse', sizes[size], color, className)}
      {...props}
    />
  )
}

// Spin animation for loaders
interface SpinProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg'
  color?: string
}

export function Spin({
  size = 'md',
  color = 'border-blue-500',
  className,
  ...props
}: SpinProps) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  }

  return (
    <div
      className={cn(
        'rounded-full border-zinc-200 animate-spin',
        sizes[size],
        className
      )}
      style={{
        borderTopColor: 'currentColor',
      }}
      {...props}
    />
  )
}

// Progress bar animation
interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  color?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function Progress({
  value,
  max = 100,
  color = 'bg-blue-500',
  showLabel = false,
  size = 'md',
  className,
  ...props
}: ProgressProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100))
  
  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }

  return (
    <div className={cn('w-full', className)} {...props}>
      {showLabel && (
        <div className="flex justify-between text-xs text-zinc-500 mb-1">
          <span>{value}</span>
          <span>{percent.toFixed(0)}%</span>
        </div>
      )}
      <div className={cn('w-full bg-zinc-200 rounded-full overflow-hidden', sizes[size])}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            color
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

// Shimmer effect for loading states
interface ShimmerProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number
  height?: string | number
}

export function Shimmer({
  width = '100%',
  height = '1rem',
  className,
  ...props
}: ShimmerProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-zinc-200 rounded',
        className
      )}
      style={{ width, height }}
      {...props}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent"
      />
    </div>
  )
}

// Scale animation on hover
interface ScaleOnHoverProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  scale?: number
}

export function ScaleOnHover({
  children,
  scale = 1.02,
  className,
  ...props
}: ScaleOnHoverProps) {
  return (
    <div
      className={cn(
        'transition-transform duration-200 hover:scale-[var(--scale)]',
        className
      )}
      style={{ '--scale': scale } as React.CSSProperties}
      {...props}
    >
      {children}
    </div>
  )
}

export default {
  FadeIn,
  Stagger,
  Pulse,
  Spin,
  Progress,
  Shimmer,
  ScaleOnHover,
}
