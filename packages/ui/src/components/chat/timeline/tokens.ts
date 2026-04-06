/**
 * CSS variable tokens for the ToolTimeline visual system.
 *
 * These tokens control shared dimensions (rail width, icon size, connector color, etc.)
 * across all timeline primitives. Injected as inline styles on the ToolTimeline root element.
 */
import type { CSSProperties } from 'react'

export const timelineTokenDefaults: Record<string, string> = {
  '--tl-rail-width': '2.25rem',
  '--tl-step-header-height': '2rem',
  '--tl-icon-size': '0.75rem',
  '--tl-connector-color': 'var(--color-border)',
  '--tl-surface-bg': 'var(--color-panel-elevated)',
  '--tl-surface-radius': '0.75rem',
  '--tl-step-top-padding': '0.25rem',
  '--tl-header-text-px': '0.375rem',
  '--tl-header-text-py': '0.125rem',
}

export function getTimelineStyles(
  overrides?: Record<string, string>,
): CSSProperties {
  return { ...timelineTokenDefaults, ...overrides } as CSSProperties
}
