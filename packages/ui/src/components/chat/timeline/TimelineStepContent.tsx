/**
 * TimelineStepContent — matches Onyx's TimelineStepContent.
 * Header row + collapsible body with consistent padding.
 */
import { memo, useEffect } from 'react'
import type { ReactNode } from 'react'

export interface TimelineStepContentProps {
  header: ReactNode
  isExpanded?: boolean
  onToggle?: () => void
  collapsible?: boolean
  buttonTitle?: string
  surfaceBackground?: 'tint' | 'error' | 'transparent'
  children?: ReactNode
}

function FoldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  )
}

function ExpandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function XOctagonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}

function TlStepStyles() {
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

export const TimelineStepContent = memo(function TimelineStepContent({
  header,
  isExpanded,
  onToggle,
  collapsible,
  buttonTitle,
  surfaceBackground,
  children,
}: TimelineStepContentProps) {
  return (
    <div className="flex flex-col px-1 pb-1" data-testid="timeline-step-content">
      <TlStepStyles />
      <div className="flex items-center justify-between h-[var(--tl-step-header-height)] pl-1">
        <div className="pt-[var(--tl-step-top-padding)] pl-[var(--tl-common-text-padding)] flex-1 min-w-0">
          {header}
        </div>
        <div className="flex-none flex items-center justify-center w-[var(--tl-step-header-right-section-width)]">
          {surfaceBackground === 'error' ? (
            <div className="flex items-center justify-center p-1.5" style={{ color: 'var(--tl-status-error-05, #dc2626)' }}>
              <XOctagonIcon />
            </div>
          ) : collapsible ? (
            <button
              type="button"
              className="tl-btn-tertiary flex items-center justify-center gap-1 p-1 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
              onClick={onToggle}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {buttonTitle && <span className="text-xs">{buttonTitle}</span>}
              {isExpanded ? <FoldIcon /> : <ExpandIcon />}
            </button>
          ) : null}
        </div>
      </div>
      {isExpanded && children ? (
        <div className="px-1 pb-1">
          <div className="rounded-lg bg-white p-2.5">
            {children}
          </div>
        </div>
      ) : null}
    </div>
  )
})
