/**
 * CompletedHeader — matches Onyx's CompletedHeader layout.
 * "Thought for Xs" text + "N steps" tertiary button with fold/expand icon.
 */
import { memo } from 'react'

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins} minutes`
}

/** Onyx SvgFold equivalent — lines collapsing upward */
function FoldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  )
}

/** Onyx SvgExpand equivalent — lines expanding downward */
function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
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
  const durationText = durationSeconds > 0
    ? `Thought for ${formatDuration(durationSeconds)}`
    : 'Thought for a moment'

  const stepsLabel = `${totalSteps} ${totalSteps === 1 ? 'step' : 'steps'}`

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle()
        }
      }}
      className="flex items-center justify-between w-full cursor-pointer select-none"
      aria-expanded={isExpanded}
      aria-label={isExpanded ? 'Collapse timeline' : 'Expand timeline'}
    >
      <div className="flex items-center gap-2 px-[var(--tl-header-text-px)] py-[var(--tl-header-text-py)]">
        <span className="text-sm text-muted">
          {durationText}
        </span>
      </div>
      <button
        type="button"
        className="flex items-center gap-1 text-xs text-muted/60 hover:text-muted px-1.5 py-0.5 rounded transition-colors cursor-pointer border-none bg-transparent"
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        aria-label={isExpanded ? 'Collapse timeline' : 'Expand timeline'}
        aria-expanded={isExpanded}
      >
        <span>{stepsLabel}</span>
        {isExpanded ? <FoldIcon /> : <ExpandIcon />}
      </button>
    </div>
  )
})
