import type { ReactNode } from 'react'
import { useMemo } from 'react'
import type { ChatMessage, ToolExecution } from '../../client/types.js'
import { MessageItem, type MessageItemClassNames } from './MessageItem.js'
import { AgentTurnView } from './AgentTurnView.js'
import { groupMessagesIntoTurns } from '../../state/group-messages.js'

export type MessageListClassNames = {
  root?: string
  item?: string
  itemWrapper?: string
  itemWrapperUser?: string
  itemWrapperAssistant?: string
} & MessageItemClassNames

const defaults = {
  root: 'flex flex-col gap-12',
  wrapperBase: 'flex w-full px-4',
  wrapperUser: 'justify-end',
  wrapperAssistant: 'justify-start',
}

export function MessageList({
  messages,
  toolExecutions,
  renderAvatar,
  onCopy,
  onRegenerate,
  className,
  classNames,
}: {
  messages: ChatMessage[]
  toolExecutions?: Map<string, ToolExecution>
  renderAvatar?: (message: ChatMessage) => ReactNode
  onCopy?: (message: ChatMessage) => void
  onRegenerate?: (message: ChatMessage) => void
  className?: string
  classNames?: MessageListClassNames
}) {
  const turns = useMemo(() => groupMessagesIntoTurns(messages), [messages])

  function getWrapperClass(role: string) {
    if (classNames?.itemWrapper) return classNames.itemWrapper
    const roleClass = role === 'user'
      ? (classNames?.itemWrapperUser ?? defaults.wrapperUser)
      : (classNames?.itemWrapperAssistant ?? defaults.wrapperAssistant)
    return `${defaults.wrapperBase} ${roleClass}`
  }

  return (
    <div className={[classNames?.root ?? defaults.root, className].filter(Boolean).join(' ')}>
      {turns.map((turn, i) => {
        if (turn.type === 'user') {
          return (
            <div key={turn.message.id} className={getWrapperClass('user')}>
              <MessageItem
                message={turn.message}
                renderAvatar={renderAvatar}
                onCopy={onCopy}
                onRegenerate={onRegenerate}
                className={classNames?.item}
                classNames={classNames}
              />
            </div>
          )
        }

        // Agent turn: timeline + final answer
        const turnKey = turn.steps[0]?.toolCall.id ?? turn.finalAnswer?.id ?? `agent-${i}`
        return (
          <div key={turnKey} className={getWrapperClass('assistant')}>
            <AgentTurnView
              turn={turn}
              toolExecutions={toolExecutions}
              renderAvatar={renderAvatar}
              onCopy={onCopy}
              onRegenerate={onRegenerate}
              classNames={classNames}
            />
          </div>
        )
      })}
    </div>
  )
}
