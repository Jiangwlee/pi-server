/**
 * TimelineRail — left-side icon column with 1px vertical connectors.
 *
 * Renders a fixed-width column containing:
 *  - Top connector line (hidden when isFirst)
 *  - Centered StateIcon reflecting the tool execution state
 *  - Bottom connector line (hidden when isLast)
 *
 * Props:
 *  - state: ToolRenderState ('inprogress' | 'complete' | 'error')
 *  - isFirst?: boolean — hides the top connector
 *  - isLast?: boolean — hides the bottom connector
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
      className="w-[var(--tl-rail-width)] flex flex-col items-center flex-shrink-0"
      data-testid="timeline-rail"
    >
      {/* Top connector */}
      <div
        className="w-px flex-none"
        style={{
          height: 'var(--tl-step-top-padding)',
          backgroundColor: isFirst ? 'transparent' : 'var(--tl-connector-color)',
        }}
        data-testid="rail-top-connector"
        data-visible={!isFirst}
      />
      {/* Icon */}
      <div className="flex items-center justify-center flex-none" data-testid="rail-icon">
        <StateIcon state={state} />
      </div>
      {/* Bottom connector */}
      <div
        className="w-px flex-1"
        style={{
          backgroundColor: isLast ? 'transparent' : 'var(--tl-connector-color)',
        }}
        data-testid="rail-bottom-connector"
        data-visible={!isLast}
      />
    </div>
  )
})
