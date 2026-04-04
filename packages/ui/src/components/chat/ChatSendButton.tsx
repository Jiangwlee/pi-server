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
    send?: string
    stop?: string
    hint?: string
  }
  leftAddons?: ReactNode
  rightAddons?: ReactNode
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
  const sendText = texts?.send ?? 'Send'
  const stopText = texts?.stop ?? 'Stop'
  const hintText = texts?.hint ?? `↵ ${sendText}`

  return (
    <div
      className={[classNames?.root, className].filter(Boolean).join(' ')}
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 8,
        padding: '0 12px',
      }}
    >
      {leftAddons}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {!loading ? (
          <span className={classNames?.hint} style={{ fontSize: 12, color: 'inherit', opacity: 0.5 }}>
            {hintText}
          </span>
        ) : null}
        {rightAddons}
        {loading ? (
          <button
            type="button"
            className={classNames?.button}
            onClick={onStop}
            style={{
              cursor: 'pointer',
              border: 'none',
              padding: '6px 16px',
              borderRadius: 6,
              font: 'inherit',
            }}
          >
            {stopText}
          </button>
        ) : (
          <button
            type="button"
            className={classNames?.button}
            onClick={onSend}
            style={{
              cursor: 'pointer',
              border: 'none',
              padding: '6px 16px',
              borderRadius: 6,
              font: 'inherit',
            }}
          >
            {sendText}
          </button>
        )}
      </div>
    </div>
  )
}

export const ChatSendButton = memo(ChatSendButtonImpl)
