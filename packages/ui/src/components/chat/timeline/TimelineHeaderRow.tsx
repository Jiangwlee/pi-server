/**
 * TimelineHeaderRow — matches Onyx's TimelineHeaderRow.
 * Fixed-height row with rail-width spacer + flex content area.
 */
import { memo } from 'react'
import type { ReactNode } from 'react'

export interface TimelineHeaderRowProps {
  children: ReactNode
  /** Left slot — typically an avatar */
  left?: ReactNode
}

export const TimelineHeaderRow = memo(function TimelineHeaderRow({
  children,
  left,
}: TimelineHeaderRowProps) {
  return (
    <div className="flex w-full h-[var(--tl-header-row-height)]" data-testid="timeline-header-row">
      <div className="flex items-center justify-center w-[var(--tl-rail-width)] h-[var(--tl-header-row-height)]">
        {left}
      </div>
      <div className="flex-1 min-w-0 h-full">
        {children}
      </div>
    </div>
  )
})
