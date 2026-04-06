import { memo, useState, useRef, useEffect } from 'react'
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
}

export const TimelineStep = memo(function TimelineStep({
  toolCall,
  result,
  state,
  meta,
  streaming,
  isFirst,
  isLast,
}: TimelineStepProps) {
  const [isHover, setIsHover] = useState(false)
  // Step-level collapse: expanded while streaming, collapsed when complete
  const [isExpanded, setIsExpanded] = useState(state === 'inprogress')
  const userToggledRef = useRef(false)
  const prevStateRef = useRef(state)

  // Auto-collapse when step completes (if user hasn't manually toggled)
  useEffect(() => {
    if (prevStateRef.current === 'inprogress' && state !== 'inprogress') {
      if (!userToggledRef.current) {
        setIsExpanded(false)
      }
    }
    prevStateRef.current = state
  }, [state])

  const handleToggle = () => {
    userToggledRef.current = true
    setIsExpanded((prev) => !prev)
  }

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
          collapsible
          isExpanded={isExpanded}
          onToggle={handleToggle}
          surfaceBackground={surface}
        >
          <ToolCallBlock toolCall={toolCall} result={result} streaming={streaming} />
        </TimelineStepContent>
      </TimelineSurface>
    </div>
  )
})
