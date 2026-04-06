import { memo, useCallback, useState } from 'react'
import SvgCopy from '../icons/SvgCopy.js'
import SvgCheck from '../icons/SvgCheck.js'
import SvgThumbsUp from '../icons/SvgThumbsUp.js'
import SvgThumbsDown from '../icons/SvgThumbsDown.js'

export type MessageToolbarClassNames = {
  root?: string
  button?: string
}

export type MessageToolbarProps = {
  text?: string
  onCopy?: () => void
  onRegenerate?: () => void
  onFeedback?: (isPositive: boolean) => void
  feedback?: boolean | null
  className?: string
  classNames?: MessageToolbarClassNames
}

const defaults = {
  root: 'flex items-center gap-0.5 mt-1',
}

function ToolbarButton({
  onClick,
  label,
  active,
  children,
}: {
  onClick: () => void
  label: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={[
        'flex h-7 w-7 items-center justify-center rounded-md border-none cursor-pointer',
        'transition-colors duration-fast',
        active
          ? 'bg-accent-soft text-accent'
          : 'bg-transparent text-text-muted hover:bg-hover hover:text-text-primary',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export const MessageToolbar = memo(function MessageToolbar({
  text,
  onCopy,
  onRegenerate,
  onFeedback,
  feedback,
  className,
  classNames,
}: MessageToolbarProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    if (onCopy) {
      onCopy()
      return
    }
    if (!text) return
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }, [text, onCopy])

  const handleFeedback = useCallback((isPositive: boolean) => {
    if (!onFeedback) return
    // clicking active button toggles off — handled by parent via null
    onFeedback(isPositive)
  }, [onFeedback])

  return (
    <div className={[classNames?.root ?? defaults.root, className].filter(Boolean).join(' ')}>
      <ToolbarButton onClick={handleCopy} label={copied ? 'Copied' : 'Copy message'}>
        {copied ? <SvgCheck size={14} /> : <SvgCopy size={14} />}
      </ToolbarButton>

      {onRegenerate ? (
        <ToolbarButton onClick={onRegenerate} label="Retry">
          <span className="text-xs leading-none">↺</span>
        </ToolbarButton>
      ) : null}

      {onFeedback ? (
        <>
          <ToolbarButton
            onClick={() => handleFeedback(true)}
            label="Good response"
            active={feedback === true}
          >
            <SvgThumbsUp size={14} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => handleFeedback(false)}
            label="Bad response"
            active={feedback === false}
          >
            <SvgThumbsDown size={14} />
          </ToolbarButton>
        </>
      ) : null}
    </div>
  )
})
