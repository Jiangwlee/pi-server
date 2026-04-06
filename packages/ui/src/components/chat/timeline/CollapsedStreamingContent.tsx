/**
 * CollapsedStreamingContent — compact bubble shown below the timeline header
 * when a tool timeline is collapsed during streaming.
 *
 * Display conditions (checked by parent ToolTimeline):
 *   isStreaming && !isExpanded && partialResult exists && renderer supports compact
 *
 * Layout:
 *   padding-left: rail-width (aligns with content, no TimelineRail)
 *   TimelineSurface (px-2 pb-2, roundedBottom) → ToolCallBlock (renderType='compact')
 */
import { memo } from 'react'
import type { ToolExecution } from '../../../client/types.js'
import type { ToolStep } from '../../../state/group-messages.js'
import { TimelineSurface } from './TimelineSurface.js'
import { ToolCallBlock } from '../ToolCallBlock.js'

export interface CollapsedStreamingContentProps {
  step: ToolStep
  toolExecution: ToolExecution
}

export const CollapsedStreamingContent = memo(function CollapsedStreamingContent({
  step,
  toolExecution,
}: CollapsedStreamingContentProps) {
  return (
    <div className="pl-[var(--tl-rail-width)]">
      <TimelineSurface className="px-2 pb-2" roundedBottom>
        <ToolCallBlock
          toolCall={step.toolCall}
          result={toolExecution.partialResult}
          streaming
          renderType="compact"
        />
      </TimelineSurface>
    </div>
  )
})
