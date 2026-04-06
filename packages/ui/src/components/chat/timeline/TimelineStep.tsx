/**
 * TimelineStep — composes Rail + Surface + StepContent + ToolCallBlock for a single tool step.
 *
 * Represents one step in the ToolTimeline, combining the left-side rail connector,
 * a background surface, and the collapsible content area containing the tool output.
 *
 * Props:
 *   toolCall   — the ToolCall content block
 *   result     — partialResult or finalResult as ChatMessage
 *   state      — 'inprogress' | 'complete' | 'error'
 *   streaming  — whether the tool is currently streaming output
 *   isFirst    — first step in timeline (hides top connector)
 *   isLast     — last step in timeline (hides bottom connector)
 *   isExpanded — controls body visibility
 *   onToggle   — collapse toggle callback
 *
 * Usage:
 *   <TimelineStep toolCall={tc} result={msg} state="complete" isFirst isLast />
 */
import { memo } from 'react'
import type { ChatMessage, ToolCall } from '../../../client/types.js'
import type { ToolRenderState } from '../../../tools/types.js'
import { TimelineRail } from './TimelineRail.js'
import { TimelineSurface } from './TimelineSurface.js'
import { TimelineStepContent } from './TimelineStepContent.js'
import { ToolCallBlock } from '../ToolCallBlock.js'

export interface TimelineStepProps {
  toolCall: ToolCall
  result?: ChatMessage
  state: ToolRenderState
  streaming?: boolean
  isFirst?: boolean
  isLast?: boolean
  isExpanded?: boolean
  onToggle?: () => void
}

export const TimelineStep = memo(function TimelineStep({
  toolCall,
  result,
  state,
  streaming,
  isFirst,
  isLast,
  isExpanded,
  onToggle,
}: TimelineStepProps) {
  return (
    <div className="flex w-full" data-testid="timeline-step">
      <TimelineRail state={state} isFirst={isFirst} isLast={isLast} />
      <TimelineSurface
        roundedTop={isFirst}
        roundedBottom={isLast}
        background={state === 'error' ? 'error' : 'tint'}
      >
        <TimelineStepContent
          header={<span className="text-xs font-medium text-muted">{toolCall.name}</span>}
          collapsible={!!onToggle}
          isExpanded={isExpanded}
          onToggle={onToggle}
        >
          <ToolCallBlock toolCall={toolCall} result={result} streaming={streaming} />
        </TimelineStepContent>
      </TimelineSurface>
    </div>
  )
})
