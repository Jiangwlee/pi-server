import { memo } from 'react'
import type { ToolRenderState } from '../types.js'

export type ToolHeaderClassNames = {
  root?: string
  icon?: string
  label?: string
  spinner?: string
}

export const ToolHeader = memo(function ToolHeader({
  state,
  label,
  classNames,
}: {
  state: ToolRenderState
  label: string
  classNames?: ToolHeaderClassNames
}) {
  return (
    <div
      className={classNames?.root}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      <StateIcon state={state} className={classNames?.icon} />
      <span className={classNames?.label}>{label}</span>
      {state === 'inprogress' ? (
        <Spinner className={classNames?.spinner} />
      ) : null}
    </div>
  )
})

/**
 * StateIcon — matches Onyx's icon sizing (--tl-icon-size = 0.75rem = 12px)
 * and color (stroke-text-02 = --tl-text-02).
 */
export function StateIcon({
  state,
  className,
  size = 12,
}: {
  state: ToolRenderState
  className?: string
  size?: number
}) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: state === 'error'
      ? 'var(--danger, #ef4444)'
      : 'var(--tl-text-02, rgba(0,0,0,0.45))',
  }

  if (state === 'error') {
    return (
      <span className={className} style={style}>
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
    )
  }

  if (state === 'complete') {
    return (
      <span className={className} style={style}>
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }

  // inprogress — dashed circle
  return (
    <span className={className} style={style}>
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
      </svg>
    </span>
  )
}

function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        width: 12,
        height: 12,
        border: '1.5px solid currentColor',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'tool-header-spin 0.8s linear infinite',
        opacity: 0.6,
        flexShrink: 0,
      }}
    />
  )
}

// Inject keyframes once
if (typeof document !== 'undefined') {
  const styleId = 'tool-header-keyframes'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = '@keyframes tool-header-spin { to { transform: rotate(360deg) } }'
    document.head.appendChild(style)
  }
}
