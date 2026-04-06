/**
 * TimelineSurface — background container with rounded corners and color theming.
 *
 * Wraps step content with a configurable background and independently controlled
 * top/bottom border radii.
 *
 * Props:
 *  - children: ReactNode
 *  - className?: string — additional classes
 *  - roundedTop?: boolean — apply rounded-t-xl
 *  - roundedBottom?: boolean — apply rounded-b-xl
 *  - background?: 'tint' | 'transparent' | 'error'
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

const bgMap: Record<string, string> = {
  tint: 'bg-panel-elevated',
  error: 'bg-error/10',
  transparent: '',
}

export const TimelineSurface = memo(function TimelineSurface({
  children,
  className,
  roundedTop,
  roundedBottom,
  background = 'tint',
}: TimelineSurfaceProps) {
  const classes = [
    'flex-1 min-w-0',
    bgMap[background] || '',
    roundedTop ? 'rounded-t-xl' : '',
    roundedBottom ? 'rounded-b-xl' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} data-testid="timeline-surface">
      {children}
    </div>
  )
})
