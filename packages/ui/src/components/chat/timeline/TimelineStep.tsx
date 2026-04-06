import { memo, useState } from 'react'
import type { ChatMessage, ToolCall } from '../../../client/types.js'
import type { ToolRenderState } from '../tools/types.js'
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
  const [isHover, setIsHover] = useState(false)

  return (
    <div
      className="flex w-full"
      data-testid="timeline-step"
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      <TimelineRail state={state} isFirst={isFirst} isLast={isLast} isHover={isHover} />
      <TimelineSurface
        roundedBottom={isLast}
        background={state === 'error' ? 'error' : 'tint'}
        isHover={isHover}
        className="flex flex-col"
      >
        <TimelineStepContent
          header={<span className="text-sm" style={{ color: 'var(--tl-text-04, rgba(0,0,0,0.75))' }}>{toolCall.name}</span>}
          collapsible={!!onToggle}
          isExpanded={isExpanded}
          onToggle={onToggle}
          surfaceBackground={state === 'error' ? 'error' : 'tint'}
        >
          <ToolCallBlock toolCall={toolCall} result={result} streaming={streaming} />
        </TimelineStepContent>
      </TimelineSurface>
    </div>
  )
})
