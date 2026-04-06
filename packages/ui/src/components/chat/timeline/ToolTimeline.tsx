/**
 * ToolTimeline — entry component matching Onyx's AgentTimeline layout.
 *
 * Manages streaming vs completed state, collapse control with user-intent
 * tracking, and composes TimelineHeaderRow + headers + steps + Done indicator.
 */
import { memo, useState, useRef, useEffect } from 'react'
import type { ToolExecution } from '../../../client/types.js'
import type { ToolStep } from '../../../state/group-messages.js'
import { resolveToolState } from '../../../state/resolve-tool-state.js'
import { getTimelineStyles } from './tokens.js'
import { TimelineHeaderRow } from './TimelineHeaderRow.js'
import { StreamingHeader } from './StreamingHeader.js'
import { CompletedHeader } from './CompletedHeader.js'
import { TimelineStep } from './TimelineStep.js'
import { DoneStep } from './DoneStep.js'
import { AgentAvatar } from './AgentAvatar.js'
import { CollapsedStreamingContent } from './CollapsedStreamingContent.js'
import { getToolRenderer, defaultRenderer, getToolMetadata } from '../tools/index.js'

function rendererSupportsCompact(toolName: string): boolean {
  const renderer = getToolRenderer(toolName)
  if (renderer) return renderer.supportsRenderType?.('compact') ?? false
  // Unregistered tools fallback to defaultRenderer
  return defaultRenderer.supportsRenderType?.('compact') ?? true
}

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

  // Show "Done" step when completed and expanded
  const showDoneStep = !isStreaming && isExpanded && steps.length > 0

  return (
    <div
      className={[
        'flex flex-col pl-[var(--tl-agent-message-padding-left)]',
        classNames?.root,
      ].filter(Boolean).join(' ')}
      style={getTimelineStyles()}
      data-testid="tool-timeline"
    >
      <TimelineHeaderRow left={<AgentAvatar size={24} />}>
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

      {(() => {
        const lastStep = steps[steps.length - 1]
        const lastExecution = lastStep ? toolExecutions?.get(lastStep.toolCall.id) : undefined
        const showCollapsed = isStreaming && !isExpanded
          && !!lastExecution?.partialResult
          && rendererSupportsCompact(lastStep.toolCall.name)
        return showCollapsed
          ? <CollapsedStreamingContent step={lastStep} toolExecution={lastExecution!} />
          : null
      })()}

      {isExpanded && (
        <div>
          {steps.map((step, i) => {
            const execution = toolExecutions?.get(step.toolCall.id)
            const result = execution?.partialResult ?? step.result
            const state = execution
              ? execution.state
              : resolveToolState(result, streaming)
            const meta = getToolMetadata(step.toolCall, result, state)

            return (
              <TimelineStep
                key={step.toolCall.id}
                toolCall={step.toolCall}
                result={result}
                state={state}
                meta={meta}
                streaming={execution?.state === 'inprogress'}
                isFirst={i === 0}
                isLast={i === steps.length - 1 && !showDoneStep}
                isExpanded={true}
              />
            )
          })}
          {showDoneStep && <DoneStep />}
        </div>
      )}
    </div>
  )
})
