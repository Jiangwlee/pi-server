/**
 * DoneStep — "Done" indicator at the bottom of completed timeline.
 * Matches Onyx's StepContainer with SvgCheckCircle + "Done" header.
 */
import { memo } from 'react'

function CheckCircleIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      style={{ color: 'var(--color-text-02, #71717a)' }}
    >
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export const DoneStep = memo(function DoneStep() {
  return (
    <div className="flex w-full" data-testid="timeline-done-step">
      {/* Rail column */}
      <div className="relative flex flex-col items-center w-[var(--tl-rail-width)]">
        <div className="w-full shrink-0 flex flex-col items-center h-[var(--tl-step-header-height)]">
          {/* Top connector */}
          <div
            className="w-px"
            style={{
              height: 'calc(var(--tl-step-top-padding) * 2)',
              backgroundColor: 'var(--tl-connector-color)',
            }}
          />
          {/* Icon */}
          <div
            className="shrink-0 flex items-center justify-center"
            style={{
              width: 'var(--tl-branch-icon-wrapper-size)',
              height: 'var(--tl-branch-icon-wrapper-size)',
            }}
          >
            <CheckCircleIcon />
          </div>
          {/* No bottom connector — this is always last */}
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0 rounded-b-xl bg-black/[0.02] dark:bg-white/[0.03] transition-colors duration-200">
        <div className="flex items-center h-[var(--tl-step-header-height)] pl-2">
          <span className="text-xs text-muted/80">Done</span>
        </div>
      </div>
    </div>
  )
})
