/**
 * TimelineSurface — background container matching Onyx's TimelineSurface.
 * Uses bg-background-tint-00 equivalent for subtle tint.
 */
import { memo } from 'react'
import type { ReactNode } from 'react'

export interface TimelineSurfaceProps {
  children: ReactNode
  className?: string
  roundedTop?: boolean
  roundedBottom?: boolean
  background?: 'tint' | 'transparent' | 'error'
}

export const TimelineSurface = memo(function TimelineSurface({
  children,
  className,
  roundedTop,
  roundedBottom,
  background = 'tint',
}: TimelineSurfaceProps) {
  const bgClass = background === 'error'
    ? 'bg-red-500/[0.06]'
    : ''

  const bgStyle = background === 'tint'
    ? { backgroundColor: 'var(--tl-bg-tint-00, rgba(0,0,0,0.02))' }
    : undefined

  const classes = [
    'flex-1 min-w-0 transition-colors duration-200',
    bgClass,
    roundedTop ? 'rounded-t-xl' : '',
    roundedBottom ? 'rounded-b-xl' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} style={bgStyle} data-testid="timeline-surface">
      {children}
    </div>
  )
})
