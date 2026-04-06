/**
 * TimelineStepContent — header row with optional collapsible body.
 *
 * Renders a header slot with an optional collapse toggle button on the right,
 * and conditionally renders children when expanded.
 *
 * Props:
 *  - header: ReactNode — left-side header content
 *  - isExpanded?: boolean — controls body visibility
 *  - onToggle?: () => void — collapse toggle callback
 *  - collapsible?: boolean — show the toggle button (default false)
 *  - children?: ReactNode — body content, rendered only when expanded
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

export const TimelineStepContent = memo(function TimelineStepContent({
  header,
  isExpanded,
  onToggle,
  collapsible,
  children,
}: TimelineStepContentProps) {
  return (
    <div data-testid="timeline-step-content">
      <div className="flex items-center justify-between min-h-[var(--tl-step-header-height)] px-2">
        <div className="flex-1 min-w-0">{header}</div>
        {collapsible ? (
          <button
            type="button"
            className="flex-none text-xs text-muted hover:text-primary cursor-pointer border-none bg-transparent p-1"
            onClick={onToggle}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        ) : null}
      </div>
      {isExpanded && children ? (
        <div className="px-2 pb-2">{children}</div>
      ) : null}
    </div>
  )
})
