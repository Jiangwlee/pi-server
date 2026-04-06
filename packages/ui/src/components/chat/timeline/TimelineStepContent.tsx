/**
 * TimelineStepContent — matches Onyx's TimelineStepContent.
 * Header row + collapsible body with consistent padding.
 */
import { memo } from 'react'
import type { ReactNode } from 'react'

export interface TimelineStepContentProps {
  header: ReactNode
  isExpanded?: boolean
  onToggle?: () => void
  collapsible?: boolean
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

export const TimelineStepContent = memo(function TimelineStepContent({
  header,
  isExpanded,
  onToggle,
  collapsible,
  children,
}: TimelineStepContentProps) {
  return (
    <div className="flex flex-col px-1 pb-1" data-testid="timeline-step-content">
      <div className="flex items-center justify-between h-[var(--tl-step-header-height)] pl-1">
        <div className="pt-[var(--tl-step-top-padding)] flex-1 min-w-0">
          {header}
        </div>
        {collapsible ? (
          <button
            type="button"
            className="flex-none flex items-center justify-center text-muted/60 hover:text-muted cursor-pointer border-none bg-transparent p-1"
            onClick={onToggle}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <FoldIcon /> : <ExpandIcon />}
          </button>
        ) : null}
      </div>
      {isExpanded && children ? (
        <div className="pl-1 pb-1">{children}</div>
      ) : null}
    </div>
  )
})
