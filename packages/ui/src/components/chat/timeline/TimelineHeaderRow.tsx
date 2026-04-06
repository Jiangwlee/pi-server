/**
 * TimelineHeaderRow — matches Onyx's TimelineHeaderRow.
 * Fixed-height row with rail-width spacer + flex content area.
 */
import { memo } from 'react'
import type { ReactNode } from 'react'

export interface TimelineHeaderRowProps {
  children: ReactNode
  /** Whether the content area should show rounded bottom corners */
  showRoundedBottom?: boolean
}

export const TimelineHeaderRow = memo(function TimelineHeaderRow({
  children,
  showRoundedBottom,
}: TimelineHeaderRowProps) {
  return (
    <div className="flex w-full h-[var(--tl-header-row-height)]" data-testid="timeline-header-row">
      <div className="flex items-center justify-center w-[var(--tl-rail-width)] h-[var(--tl-header-row-height)]" />
      <div className={[
        'flex flex-1 min-w-0 h-full items-center justify-between p-1 rounded-t-xl transition-colors duration-300',
        'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]',
        showRoundedBottom ? 'rounded-b-xl' : '',
      ].join(' ')}>
        {children}
      </div>
    </div>
  )
})
