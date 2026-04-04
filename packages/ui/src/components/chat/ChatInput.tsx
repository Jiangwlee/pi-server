import { useState } from 'react'
import type { SessionStatus } from '../../client/types.js'

type ChatInputClassNames = {
  root?: string
  modelSelect?: string
  input?: string
  sendButton?: string
  abortButton?: string
}

export function ChatInput(
  {
    status,
    models,
    selectedModelId,
    onModelChange,
    onSend,
    onAbort,
    className,
    classNames,
  }: {
    status: SessionStatus
    models?: Array<{ id: string; name?: string }>
    selectedModelId?: string
    onModelChange?: (modelId: string) => void
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
        try {
          await onSend(text)
        } catch {
          // useChat handles error state; keep submit handler rejection-free.
        }
      }}
    >
      {models && models.length > 0 ? (
        <select
          className={classNames?.modelSelect}
          value={selectedModelId}
          onChange={(e) => onModelChange?.(e.target.value)}
        >
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name ?? model.id}
            </option>
          ))}
        </select>
      ) : null}
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
