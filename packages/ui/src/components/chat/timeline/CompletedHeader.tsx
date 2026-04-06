/**
 * CompletedHeader — summary header for a finished tool execution timeline.
 *
 * Displays "Used {N} tools ({X}s)" as a clickable toggle button.
 * Used inside ToolTimeline when all tools have completed.
 *
 * Props:
 *   totalSteps      — number of tool calls in the timeline
 *   durationSeconds — total wall-clock duration in seconds
 *   isExpanded      — whether the timeline body is expanded
 *   onToggle        — callback to toggle expand/collapse
 *
 * Usage:
 *   <CompletedHeader totalSteps={3} durationSeconds={5} isExpanded={false} onToggle={fn} />
 */
import { memo } from 'react'

const defaults = {
  root: 'flex items-center justify-between w-full cursor-pointer select-none text-sm',
  summary: 'font-medium',
  right: 'flex items-center gap-2 text-xs opacity-60',
  chevron: 'text-xs',
}

export const CompletedHeader = memo(function CompletedHeader({
  totalSteps,
  durationSeconds,
  isExpanded,
  onToggle,
}: {
  totalSteps: number
  durationSeconds: number
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <div
      className={defaults.root}
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle()
        }
      }}
      aria-expanded={isExpanded}
      aria-label={isExpanded ? 'Collapse timeline' : 'Expand timeline'}
    >
      <span className={defaults.summary}>
        Used {totalSteps} tools ({durationSeconds}s)
      </span>
      <span className={defaults.right}>
        <span>{totalSteps} steps</span>
        <span className={defaults.chevron}>{isExpanded ? '▼' : '▶'}</span>
      </span>
    </div>
  )
})
