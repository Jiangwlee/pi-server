import { useState } from 'react'
import type { SessionStatus } from '../../client/types.js'

type ChatInputClassNames = {
  root?: string
  input?: string
  sendButton?: string
  abortButton?: string
}

export function ChatInput(
  {
    status,
    onSend,
    onAbort,
    className,
    classNames,
  }: {
    status: SessionStatus
    onSend: (message: string) => Promise<void>
    onAbort: () => Promise<void>
    className?: string
    classNames?: ChatInputClassNames
  },
) {
  const [value, setValue] = useState('')
  const running = status === 'running'

  return (
    <form
      className={[classNames?.root, className].filter(Boolean).join(' ')}
      onSubmit={async (e) => {
        e.preventDefault()
        const text = value.trim()
        if (!text) return
        setValue('')
        await onSend(text)
      }}
    >
      <input
        className={classNames?.input}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type a message"
      />
      {running ? (
        <button
          type="button"
          className={classNames?.abortButton}
          onClick={async () => {
            await onAbort()
          }}
        >
          Abort
        </button>
      ) : (
        <button type="submit" className={classNames?.sendButton}>
          Send
        </button>
      )}
    </form>
  )
}
