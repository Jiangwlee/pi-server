/**
 * TimelineRail — left-side icon column with 1px vertical connectors.
 * Matches Onyx's TimelineIconColumn layout.
 */
import { memo } from 'react'
import type { ToolRenderState } from '../../../tools/types.js'
import { StateIcon } from '../../../tools/index.js'

export interface TimelineRailProps {
  state: ToolRenderState
  isFirst?: boolean
  isLast?: boolean
}

export const TimelineRail = memo(function TimelineRail({
  state,
  isFirst,
  isLast,
}: TimelineRailProps) {
  return (
    <div
      className="relative flex flex-col items-center w-[var(--tl-rail-width)]"
      data-testid="timeline-rail"
    >
      {/* Icon row — fixed height matching step header */}
      <div className="w-full shrink-0 flex flex-col items-center h-[var(--tl-step-header-height)]">
        {/* Top connector */}
        <div
          className="w-px"
          style={{
            height: 'calc(var(--tl-step-top-padding) * 2)',
            backgroundColor: isFirst ? 'transparent' : 'var(--tl-border-01, #e6e6e6)',
          }}
          data-testid="rail-top-connector"
          data-visible={!isFirst}
        />
        {/* Icon wrapper — 1.25rem square, centered */}
        <div
          className="shrink-0 flex items-center justify-center"
          style={{
            width: 'var(--tl-branch-icon-wrapper-size)',
            height: 'var(--tl-branch-icon-wrapper-size)',
          }}
          data-testid="rail-icon"
        >
          <StateIcon state={state} />
        </div>
        {/* Bottom connector within header row */}
        <div
          className="w-px flex-1"
          style={{ backgroundColor: 'var(--tl-border-01, #e6e6e6)' }}
        />
      </div>
      {/* Bottom connector extending to next step */}
      {!isLast && (
        <div
          className="w-px flex-1"
          style={{ backgroundColor: 'var(--tl-border-01, #e6e6e6)' }}
          data-testid="rail-bottom-connector"
          data-visible={!isLast}
        />
      )}
    </div>
  )
})
