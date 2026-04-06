/**
 * StreamingHeader — shimmer-animated header for active tool execution.
 *
 * Displays "Executing {toolName}..." with a shimmer text animation and
 * a live elapsed timer. Used inside ToolTimeline when any tool is still
 * in-progress.
 *
 * Props:
 *   toolName   — name of the currently executing tool
 *   startTime  — Date.now() when execution started (for elapsed calc)
 *   isExpanded — whether the timeline body is expanded
 *   onToggle   — callback to toggle expand/collapse
 *
 * Usage:
 *   <StreamingHeader toolName="bash" startTime={ts} isExpanded onToggle={fn} />
 */
import { memo, useState, useEffect } from 'react'

const defaults = {
  root: 'flex items-center justify-between w-full',
  text: 'text-sm font-medium',
  right: 'flex items-center gap-2 text-xs',
  button: 'p-0.5 text-xs opacity-60 hover:opacity-100',
}

export const StreamingHeader = memo(function StreamingHeader({
  toolName,
  startTime,
  isExpanded,
  onToggle,
}: {
  toolName: string
  startTime: number
  isExpanded: boolean
  onToggle: () => void
}) {
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - startTime) / 1000),
  )

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [startTime])

  return (
    <div className={defaults.root}>
      <ShimmerKeyframes />
      <span
        className={defaults.text}
        style={{
          background: 'linear-gradient(90deg, var(--color-text, #e4e4e7) 25%, var(--color-muted, #a1a1aa) 50%, var(--color-text, #e4e4e7) 75%)',
          backgroundSize: '200% 100%',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: 'tl-shimmer 2s infinite',
        }}
      >
        Executing {toolName}...
      </span>
      <span className={defaults.right}>
        {elapsed > 0 && <span>({elapsed}s)</span>}
        <button
          className={defaults.button}
          onClick={onToggle}
          aria-label={isExpanded ? 'Collapse timeline' : 'Expand timeline'}
          aria-expanded={isExpanded}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </span>
    </div>
  )
})

/** Inject shimmer keyframes once, same pattern as ToolHeader's Spinner. */
function ShimmerKeyframes() {
  useEffect(() => {
    if (typeof document === 'undefined') return
    const styleId = 'tl-shimmer-keyframes'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent =
        '@keyframes tl-shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }'
      document.head.appendChild(style)
    }
  }, [])
  return null
}
