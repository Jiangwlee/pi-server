import { memo, useCallback, useState } from 'react'

export type MessageToolbarClassNames = {
  root?: string
  button?: string
}

export type MessageToolbarProps = {
  text?: string
  onCopy?: () => void
  onRegenerate?: () => void
  className?: string
  classNames?: MessageToolbarClassNames
}

const defaults = {
  root: 'flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity',
  button: 'p-1 text-muted hover:text-primary hover:bg-hover rounded-md cursor-pointer border-none bg-transparent text-xs',
}

export const MessageToolbar = memo(function MessageToolbar({
  text,
  onCopy,
  onRegenerate,
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

  return (
    <div className={[classNames?.root ?? defaults.root, className].filter(Boolean).join(' ')}>
      <button
        type="button"
        className={classNames?.button ?? defaults.button}
        onClick={handleCopy}
        aria-label="Copy message"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      {onRegenerate ? (
        <button
          type="button"
          className={classNames?.button ?? defaults.button}
          onClick={onRegenerate}
          aria-label="Regenerate"
        >
          Retry
        </button>
      ) : null}
    </div>
  )
})
