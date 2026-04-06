import type { ReactNode } from 'react'
import { useMemo } from 'react'
import type { ChatMessage } from '../../client/types.js'
import { MessageItem, type MessageItemClassNames } from './MessageItem.js'

export type MessageListClassNames = {
  root?: string
  item?: string
  itemWrapper?: string
  itemWrapperUser?: string
  itemWrapperAssistant?: string
} & MessageItemClassNames

const defaults = {
  root: 'flex flex-col',
  wrapperBase: 'flex w-full px-4 py-2',
  wrapperUser: 'justify-end',
  wrapperAssistant: 'justify-start',
}

export function MessageList({
  messages,
  renderAvatar,
  onCopy,
  onRegenerate,
  className,
  classNames,
}: {
  messages: ChatMessage[]
  renderAvatar?: (message: ChatMessage) => ReactNode
  onCopy?: (message: ChatMessage) => void
  onRegenerate?: (message: ChatMessage) => void
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

  function getWrapperClass(role: string) {
    if (classNames?.itemWrapper) return classNames.itemWrapper
    const roleClass = role === 'user'
      ? (classNames?.itemWrapperUser ?? defaults.wrapperUser)
      : (classNames?.itemWrapperAssistant ?? defaults.wrapperAssistant)
    return `${defaults.wrapperBase} ${roleClass}`
  }

  return (
    <div className={[classNames?.root ?? defaults.root, className].filter(Boolean).join(' ')}>
      {messages.map((message) => {
        // Hide tool messages that are rendered inline with their tool call
        if (message.role === 'tool' && message.toolCallId && inlinedToolCallIds.has(message.toolCallId)) {
          return null
        }
        return (
          <div key={message.id} className={getWrapperClass(message.role)}>
            <MessageItem
              message={message}
              toolResultsByCallId={toolResultsByCallId}
              renderAvatar={renderAvatar}
              onCopy={onCopy}
              onRegenerate={onRegenerate}
              className={classNames?.item}
              classNames={classNames}
            />
          </div>
        )
      })}
    </div>
  )
}
