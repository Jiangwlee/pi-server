import { memo } from 'react'
import type { ReactNode } from 'react'

export type ChatSendButtonClassNames = {
  root?: string
  button?: string
  hint?: string
}

export type ChatSendButtonProps = {
  loading?: boolean
  onSend?: () => void
  onStop?: () => void
  className?: string
  classNames?: ChatSendButtonClassNames
  texts?: {
    hint?: string
  }
  leftAddons?: ReactNode
  rightAddons?: ReactNode
}

function IconArrowUp() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 13V3M3 8l5-5 5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconStop() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
      <rect x="1.5" y="1.5" width="9" height="9" rx="2"/>
    </svg>
  )
}

const defaults = {
  root: 'flex justify-between items-center gap-2 px-3 pb-2',
  button: 'flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-accent text-accent-foreground transition-opacity duration-fast hover:opacity-85 disabled:opacity-40',
  hint: 'text-xs text-text-muted',
}

const ChatSendButtonImpl = function ChatSendButton(
  {
    loading,
    onSend,
    onStop,
    className,
    classNames,
    texts,
    leftAddons,
    rightAddons,
  }: ChatSendButtonProps,
) {
  const hintText = texts?.hint ?? '↵ send'

  return (
    <div
      className={[classNames?.root ?? defaults.root, className].filter(Boolean).join(' ')}
    >
      {leftAddons}
      <div className="flex items-center gap-2">
        {!loading ? (
          <span className={classNames?.hint ?? defaults.hint}>
            {hintText}
          </span>
        ) : null}
        {rightAddons}
        {loading ? (
          <button
            type="button"
            aria-label="Stop"
            className={classNames?.button ?? defaults.button}
            onClick={onStop}
          >
            <IconStop />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Send"
            className={classNames?.button ?? defaults.button}
            onClick={onSend}
          >
            <IconArrowUp />
          </button>
        )}
      </div>
    </div>
  )
}

export const ChatSendButton = memo(ChatSendButtonImpl)
