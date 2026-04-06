/**
 * CSS variable tokens — 1:1 copy of Onyx's TimelineTokens contract.
 * See: onyx/web/src/app/app/message/messageComponents/timeline/primitives/tokens.ts
 */
import type { CSSProperties } from 'react'

export interface TimelineTokens {
  railWidth: string
  headerRowHeight: string
  stepHeaderHeight: string
  topConnectorHeight: string
  firstTopSpacerHeight: string
  iconSize: string
  branchIconWrapperSize: string
  branchIconSize: string
  stepHeaderRightSectionWidth: string
  headerPaddingLeft: string
  headerPaddingRight: string
  headerTextPaddingX: string
  headerTextPaddingY: string
  stepTopPadding: string
  agentMessagePaddingLeft: string
  timelineCommonTextPadding: string
}

/** Default sizing — matches Onyx's timelineTokenDefaults exactly. */
export const timelineTokenDefaults: TimelineTokens = {
  railWidth: '2.25rem',
  headerRowHeight: '2.25rem',
  stepHeaderHeight: '2rem',
  topConnectorHeight: '0.5rem',
  firstTopSpacerHeight: '0.25rem',
  iconSize: '0.75rem',
  branchIconWrapperSize: '1.25rem',
  branchIconSize: '0.75rem',
  stepHeaderRightSectionWidth: '2.125rem',
  headerPaddingLeft: '0.5rem',
  headerPaddingRight: '0.25rem',
  headerTextPaddingX: '0.375rem',
  headerTextPaddingY: '0.125rem',
  stepTopPadding: '0.25rem',
  agentMessagePaddingLeft: '0.12rem',
  timelineCommonTextPadding: '0.12rem',
}

/** Returns CSS variables for timeline layout. Matches Onyx's getTimelineStyles(). */
export function getTimelineStyles(
  tokens?: Partial<TimelineTokens>,
): CSSProperties {
  const m: TimelineTokens = { ...timelineTokenDefaults, ...tokens }
  return {
    '--tl-rail-width': m.railWidth,
    '--tl-header-row-height': m.headerRowHeight,
    '--tl-step-header-height': m.stepHeaderHeight,
    '--tl-top-connector-height': m.topConnectorHeight,
    '--tl-first-top-spacer-height': m.firstTopSpacerHeight,
    '--tl-icon-size': m.iconSize,
    '--tl-branch-icon-wrapper-size': m.branchIconWrapperSize,
    '--tl-branch-icon-size': m.branchIconSize,
    '--tl-step-header-right-section-width': m.stepHeaderRightSectionWidth,
    '--tl-header-padding-left': m.headerPaddingLeft,
    '--tl-header-padding-right': m.headerPaddingRight,
    '--tl-header-text-px': m.headerTextPaddingX,
    '--tl-header-text-py': m.headerTextPaddingY,
    '--tl-step-top-padding': m.stepTopPadding,
    '--tl-agent-message-padding-left': m.agentMessagePaddingLeft,
    '--tl-common-text-padding': m.timelineCommonTextPadding,
  } as CSSProperties
}
