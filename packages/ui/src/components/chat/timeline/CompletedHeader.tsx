/**
 * CompletedHeader — matches Onyx's CompletedHeader layout.
 * "Thought for Xs" text + "N steps" tertiary button with fold/expand icon.
 */
import { memo, useEffect } from 'react'

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
  collapsible = true,
}: {
  totalSteps: number
  durationSeconds: number
  isExpanded: boolean
  onToggle: () => void
  collapsible?: boolean
}) {
  const durationText = durationSeconds > 0
    ? `Thought for ${formatDuration(durationSeconds)}`
    : 'Thought for a moment'

  const stepsLabel = `${totalSteps} ${totalSteps === 1 ? 'step' : 'steps'}`

  return (
    <>
    <TlStyles />
    <div
      role="button"
      onClick={onToggle}
      className="flex items-center justify-between h-full"
      aria-expanded={isExpanded}
      aria-label={isExpanded ? 'Collapse timeline' : 'Expand timeline'}
    >
      <div className="flex items-center gap-2 px-[var(--tl-header-text-px)] py-[var(--tl-header-text-py)]">
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--tl-text-03, rgba(0,0,0,0.55))' }}
        >
          {durationText}
        </span>
      </div>
      {collapsible && (
        <button
          type="button"
          className="tl-btn-tertiary flex items-center gap-1 p-1 rounded-lg transition-colors border-none bg-transparent"
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
      )}
    </div>
    </>
  )
})

function TlStyles() {
  useEffect(() => {
    if (typeof document === 'undefined') return
    const styleId = 'tl-shimmer-keyframes'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = [
        '@keyframes tl-shimmer { 0% { background-position: 100% 0 } 100% { background-position: -100% 0 } }',
        '.tl-btn-tertiary { color: var(--tl-text-03, rgba(0,0,0,0.55)); }',
        '.tl-btn-tertiary:hover { color: var(--tl-text-04, rgba(0,0,0,0.75)); background-color: var(--tl-bg-tint-02, #f0f0f1); }',
      ].join('\n')
      document.head.appendChild(style)
    }
  }, [])
  return null
}
