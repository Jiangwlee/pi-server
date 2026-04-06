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

const defaults = {
  root: 'flex justify-between items-center gap-2 px-3',
  button: 'cursor-pointer border-none py-1.5 px-4 rounded-md font-inherit',
  hint: 'text-xs text-inherit opacity-50',
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
            className={classNames?.button ?? defaults.button}
            onClick={onStop}
          >
            {stopText}
          </button>
        ) : (
          <button
            type="button"
            className={classNames?.button ?? defaults.button}
            onClick={onSend}
          >
            {sendText}
          </button>
        )}
      </div>
    </div>
  )
}

export const ChatSendButton = memo(ChatSendButtonImpl)
