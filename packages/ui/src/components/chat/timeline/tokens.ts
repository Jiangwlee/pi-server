/**
 * CSS variable tokens for the ToolTimeline visual system.
 * Matches Onyx's timeline token contract for consistent sizing.
 */
import type { CSSProperties } from 'react'

export const timelineTokenDefaults: Record<string, string> = {
  '--tl-rail-width': '2.25rem',
  '--tl-header-row-height': '2.25rem',
  '--tl-step-header-height': '2rem',
  '--tl-top-connector-height': '0.5rem',
  '--tl-first-top-spacer-height': '0.25rem',
  '--tl-icon-size': '0.75rem',
  '--tl-branch-icon-wrapper-size': '1.25rem',
  '--tl-step-top-padding': '0.25rem',
  '--tl-header-text-px': '0.375rem',
  '--tl-header-text-py': '0.125rem',
  '--tl-connector-color': 'var(--color-border-01, rgba(255,255,255,0.08))',
  '--tl-agent-message-padding-left': '0.12rem',
}

export function getTimelineStyles(
  overrides?: Record<string, string>,
): CSSProperties {
  return { ...timelineTokenDefaults, ...overrides } as CSSProperties
}
