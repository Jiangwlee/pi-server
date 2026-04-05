import { useMemo } from 'react'
import type { ChatMessage } from '../../client/types.js'
import { MessageItem, type MessageItemClassNames } from './MessageItem.js'

type MessageListClassNames = {
  root?: string
  item?: string
} & MessageItemClassNames

export function MessageList({
  messages,
  className,
  classNames,
}: {
  messages: ChatMessage[]
  className?: string
  classNames?: MessageListClassNames
}) {
  // Build a lookup: toolCallId → tool result message
  const toolResultsByCallId = useMemo(() => {
    const map = new Map<string, ChatMessage>()
    for (const msg of messages) {
      if (msg.role === 'tool' && msg.toolCallId) {
        map.set(msg.toolCallId, msg)
      }
    }
    return map
  }, [messages])

  // Collect tool call IDs that have results (to hide standalone tool messages)
  const inlinedToolCallIds = useMemo(() => {
    const ids = new Set<string>()
    for (const msg of messages) {
      if (msg.role !== 'assistant') continue
      for (const block of msg.content) {
        if (block.type === 'toolCall' && block.id && toolResultsByCallId.has(block.id)) {
          ids.add(block.id)
        }
      }
    }
    return ids
  }, [messages, toolResultsByCallId])

  return (
    <div className={[classNames?.root, className].filter(Boolean).join(' ')}>
      {messages.map((message) => {
        // Hide tool messages that are rendered inline with their tool call
        if (message.role === 'tool' && message.toolCallId && inlinedToolCallIds.has(message.toolCallId)) {
          return null
        }
        return (
          <MessageItem
            key={message.id}
            message={message}
            toolResultsByCallId={toolResultsByCallId}
            className={classNames?.item}
            classNames={classNames}
          />
        )
      })}
    </div>
  )
}
