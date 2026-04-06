/**
 * StreamingHeader — matches Onyx's StreamingHeader layout.
 * Shimmer text with elapsed time button.
 */
import { memo, useState, useEffect } from 'react'

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

function FoldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  )
}

function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
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
    <>
      <ShimmerKeyframes />
      <div className="px-[var(--tl-header-text-px)] py-[var(--tl-header-text-py)]">
        <span
          className="text-sm"
          style={{
            background: 'linear-gradient(90deg, var(--shimmer-base, #a1a1aa) 10%, var(--shimmer-highlight, #d4d4d8) 40%, var(--shimmer-base, #a1a1aa) 70%)',
            backgroundSize: '200% 100%',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'tl-shimmer 2s infinite',
          }}
        >
          Executing {toolName}...
        </span>
      </div>
      {isExpanded && elapsed > 0 ? (
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-muted/60 hover:text-muted px-1.5 py-0.5 rounded transition-colors cursor-pointer border-none bg-transparent"
          onClick={onToggle}
          aria-label="Collapse timeline"
          aria-expanded={true}
        >
          <span>{formatDuration(elapsed)}</span>
          <FoldIcon />
        </button>
      ) : (
        <button
          type="button"
          className="flex items-center text-muted/60 hover:text-muted px-1 py-0.5 rounded transition-colors cursor-pointer border-none bg-transparent"
          onClick={onToggle}
          aria-label={isExpanded ? 'Collapse timeline' : 'Expand timeline'}
          aria-expanded={isExpanded}
        >
          {isExpanded ? <FoldIcon /> : <ExpandIcon />}
        </button>
      )}
    </>
  )
})

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
