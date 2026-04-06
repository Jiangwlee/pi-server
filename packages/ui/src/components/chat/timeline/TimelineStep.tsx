import { memo, useState } from 'react'
import type { ChatMessage, ToolCall } from '../../../client/types.js'
import type { ToolRenderState, ToolRenderMetadata } from '../tools/types.js'
import { TimelineRail } from './TimelineRail.js'
import { TimelineSurface } from './TimelineSurface.js'
import { TimelineStepContent } from './TimelineStepContent.js'
import { ToolCallBlock } from '../ToolCallBlock.js'

export interface TimelineStepProps {
  toolCall: ToolCall
  result?: ChatMessage
  state: ToolRenderState
  /** Renderer metadata. When provided, drives icon/status/surface instead of hardcoded values. */
  meta?: ToolRenderMetadata
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
  meta,
  streaming,
  isFirst,
  isLast,
  isExpanded,
  onToggle,
}: TimelineStepProps) {
  const [isHover, setIsHover] = useState(false)

  const surface = meta?.surfaceBackground ?? (state === 'error' ? 'error' : 'tint')
  const header = meta?.status ?? toolCall.name
  const icon = meta?.icon || undefined

  return (
    <div
      className="flex w-full"
      data-testid="timeline-step"
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      <TimelineRail state={state} icon={icon} isFirst={isFirst} isLast={isLast} isHover={isHover} />
      <TimelineSurface
        roundedBottom={isLast}
        background={surface}
        isHover={isHover}
        className="flex flex-col"
      >
        <TimelineStepContent
          header={typeof header === 'string'
            ? <span className="text-sm" style={{ color: 'var(--tl-text-04, rgba(0,0,0,0.75))' }}>{header}</span>
            : header}
          collapsible={!!onToggle}
          isExpanded={isExpanded}
          onToggle={onToggle}
          surfaceBackground={surface}
        >
          <ToolCallBlock toolCall={toolCall} result={result} streaming={streaming} />
        </TimelineStepContent>
      </TimelineSurface>
    </div>
  )
})
