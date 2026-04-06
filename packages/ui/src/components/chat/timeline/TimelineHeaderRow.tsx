/**
 * TimelineHeaderRow — header alignment layout for the timeline.
 *
 * Renders a flex row with a left spacer matching the rail width,
 * and a right flex-1 area for header content. Used by StreamingHeader
 * and CompletedHeader to align with the timeline rail.
 *
 * Props:
 *  - children: ReactNode — header content
 */
import { memo } from 'react'
import type { ReactNode } from 'react'

export interface TimelineHeaderRowProps {
  children: ReactNode
}

export const TimelineHeaderRow = memo(function TimelineHeaderRow({
  children,
}: TimelineHeaderRowProps) {
  return (
    <div className="flex items-center" data-testid="timeline-header-row">
      <div className="w-[var(--tl-rail-width)] flex-shrink-0" />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
})
