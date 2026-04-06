/**
 * ToolTimeline — entry component for rendering tool call steps as a visual timeline.
 *
 * Manages the state machine (streaming vs completed), collapse control with user-intent
 * tracking, and composes TimelineHeaderRow + StreamingHeader/CompletedHeader + TimelineStep.
 *
 * Props:
 *   steps           — array of { toolCall, result? } from the grouped agent turn
 *   toolExecutions  — map of toolCallId -> ToolExecution (live state from SSE)
 *   streaming       — whether the agent turn is still active
 *   classNames      — optional { root?: string } for styling
 *
 * Usage:
 *   <ToolTimeline steps={steps} toolExecutions={execs} streaming={true} />
 */
import { memo, useState, useRef, useEffect } from 'react'
import type { ToolExecution } from '../../../client/types.js'
import type { ToolStep } from '../groupMessages.js'
import { resolveToolState } from '../../../tools/index.js'
import { getTimelineStyles } from './tokens.js'
import { TimelineHeaderRow } from './TimelineHeaderRow.js'
import { StreamingHeader } from './StreamingHeader.js'
import { CompletedHeader } from './CompletedHeader.js'
import { TimelineStep } from './TimelineStep.js'

export interface ToolTimelineClassNames {
  root?: string
}

export interface ToolTimelineProps {
  steps: ToolStep[]
  toolExecutions?: Map<string, ToolExecution>
  streaming?: boolean
  classNames?: ToolTimelineClassNames
}

export const ToolTimeline = memo(function ToolTimeline({
  steps,
  toolExecutions,
  streaming,
  classNames,
}: ToolTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const userToggledRef = useRef(false)
  const prevStreamingRef = useRef<boolean | undefined>(undefined)

  // Derive isStreaming: true if any tool has state === 'inprogress'
  const isStreaming = toolExecutions
    ? Array.from(toolExecutions.values()).some((e) => e.state === 'inprogress')
    : !!streaming

  // Derive earliest startTime for duration calc
  const earliestStartTime = toolExecutions
    ? Math.min(...Array.from(toolExecutions.values()).map((e) => e.startTime))
    : Date.now()

  // Derive durationSeconds (wall-clock from earliest start to now)
  const durationSeconds = Math.round(
    (Date.now() - earliestStartTime) / 1000,
  )

  // Derive currentToolName for StreamingHeader
  const currentToolName = (() => {
    if (!toolExecutions) return steps[steps.length - 1]?.toolCall.name ?? ''
    const inProgress = Array.from(toolExecutions.values()).filter(
      (e) => e.state === 'inprogress',
    )
    if (inProgress.length > 0) return inProgress[inProgress.length - 1].toolName
    return steps[steps.length - 1]?.toolCall.name ?? ''
  })()

  // Auto-collapse when streaming ends (if user hasn't manually toggled)
  useEffect(() => {
    if (prevStreamingRef.current === true && !isStreaming) {
      if (!userToggledRef.current) {
        setIsExpanded(false)
      }
    }
    prevStreamingRef.current = isStreaming
  }, [isStreaming])

  const handleToggle = () => {
    userToggledRef.current = true
    setIsExpanded((prev) => !prev)
  }

  return (
    <div
      style={getTimelineStyles()}
      className={classNames?.root}
      data-testid="tool-timeline"
    >
      <TimelineHeaderRow>
        {isStreaming ? (
          <StreamingHeader
            toolName={currentToolName}
            startTime={earliestStartTime}
            isExpanded={isExpanded}
            onToggle={handleToggle}
          />
        ) : (
          <CompletedHeader
            totalSteps={steps.length}
            durationSeconds={durationSeconds}
            isExpanded={isExpanded}
            onToggle={handleToggle}
          />
        )}
      </TimelineHeaderRow>
      {isExpanded &&
        steps.map((step, i) => {
          const execution = toolExecutions?.get(step.toolCall.id)
          // Prefer live partial result, then step result
          const result = execution?.partialResult ?? step.result

          const state = execution
            ? execution.state
            : resolveToolState(result, streaming)

          return (
            <TimelineStep
              key={step.toolCall.id}
              toolCall={step.toolCall}
              result={result}
              state={state}
              streaming={execution?.state === 'inprogress'}
              isFirst={i === 0}
              isLast={i === steps.length - 1}
              isExpanded={true}
            />
          )
        })}
    </div>
  )
})
