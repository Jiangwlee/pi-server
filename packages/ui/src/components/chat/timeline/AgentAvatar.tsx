/**
 * AgentAvatar — fixed OnyxIcon diamond logo.
 * Matches Onyx's AgentAvatar placement in TimelineHeaderRow left slot.
 */
import { memo } from 'react'

/**
 * OnyxIcon — diamond-shaped SVG from Onyx's brand assets.
 * viewBox 0 0 56 56, rendered at the given size (default 24px for timeline header).
 */
function OnyxIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="currentColor"
      style={{ color: 'var(--tl-text-04, rgba(0,0,0,0.75))' }}
    >
      <path d="M27.9998 0L10.8691 7.76944L27.9998 15.5389L45.1305 7.76944L27.9998 0ZM27.9998 40.4611L10.8691 48.2306L27.9998 56L45.1305 48.2306L27.9998 40.4611ZM48.2309 10.8691L56.0001 28.0003L48.2309 45.1314L40.4617 28.0003L48.2309 10.8691ZM15.5385 28.0001L7.76923 10.869L0 28.0001L7.76923 45.1313L15.5385 28.0001Z" />
    </svg>
  )
}

export const AgentAvatar = memo(function AgentAvatar({
  size = 24,
}: {
  size?: number
}) {
  return (
    <div
      className="flex items-center justify-center"
      style={{ width: size, height: size }}
      data-testid="agent-avatar"
    >
      <OnyxIcon size={size} />
    </div>
  )
})
