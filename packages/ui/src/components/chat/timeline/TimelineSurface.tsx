/**
 * TimelineSurface — background container matching Onyx's TimelineSurface.
 * Uses CSS custom properties for theme-aware background tints.
 */
import { memo } from 'react'
import type { ReactNode } from 'react'

export interface TimelineSurfaceProps {
  children: ReactNode
  className?: string
  roundedTop?: boolean
  roundedBottom?: boolean
  background?: 'tint' | 'transparent' | 'error'
  isHover?: boolean
}

export const TimelineSurface = memo(function TimelineSurface({
  children,
  className,
  roundedTop,
  roundedBottom,
  background = 'tint',
  isHover,
}: TimelineSurfaceProps) {
  let bgStyle: React.CSSProperties | undefined
  if (isHover && background !== 'transparent') {
    bgStyle = { backgroundColor: 'var(--tl-bg-tint-02, #f0f0f1)' }
  } else if (background === 'tint') {
    bgStyle = { backgroundColor: 'var(--tl-bg-tint-00, rgba(0,0,0,0.02))' }
  } else if (background === 'error') {
    bgStyle = { backgroundColor: 'var(--tl-status-error-00, #fef7f6)' }
  }

  const classes = [
    'flex-1 min-w-0 transition-colors duration-200',
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
