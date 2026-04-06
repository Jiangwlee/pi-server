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

const btnClass = 'tl-btn-tertiary flex items-center gap-1 p-1 rounded-lg transition-colors border-none bg-transparent'

export const StreamingHeader = memo(function StreamingHeader({
  toolName,
  startTime,
  isExpanded,
  onToggle,
  collapsible = true,
  buttonTitle,
}: {
  toolName: string
  startTime: number
  isExpanded: boolean
  onToggle: () => void
  collapsible?: boolean
  buttonTitle?: string
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

  const buttonContent = buttonTitle
    ? (
        <>
          <span className="text-xs">{buttonTitle}</span>
          {isExpanded ? <FoldIcon /> : <ExpandIcon />}
        </>
      )
    : isExpanded && elapsed > 0
      ? (
          <>
            <span className="text-xs">{formatDuration(elapsed)}</span>
            <FoldIcon />
          </>
        )
      : (isExpanded ? <FoldIcon /> : <ExpandIcon />)

  return (
    <>
      <TlStyles />
      <div className="flex items-center justify-between h-full">
        <div className="px-[var(--tl-header-text-px)] py-[var(--tl-header-text-py)]">
          <span
            className="text-sm font-semibold"
            style={{
              background: 'linear-gradient(90deg, var(--shimmer-base, #a3a3a3) 10%, var(--shimmer-highlight, #000000) 40%, var(--shimmer-base, #a3a3a3) 70%)',
              backgroundSize: '200% 100%',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'tl-shimmer 1.8s ease-out infinite',
            }}
          >
            Executing {toolName}...
          </span>
        </div>
        {collapsible && (
          <button
            type="button"
            className={btnClass}
            onClick={onToggle}
            aria-label={isExpanded ? 'Collapse timeline' : 'Expand timeline'}
            aria-expanded={isExpanded}
          >
            {buttonContent}
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
