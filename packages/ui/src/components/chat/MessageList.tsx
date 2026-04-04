import type { ChatMessage } from '../../client/types.js'
import { MessageItem, type MessageItemClassNames } from './MessageItem.js'

type MessageListClassNames = {
  root?: string
  item?: string
} & MessageItemClassNames

export function MessageList(
  {
    messages,
    className,
    classNames,
  }: {
    messages: ChatMessage[]
    className?: string
    classNames?: MessageListClassNames
  },
) {
  return (
    <div className={[classNames?.root, className].filter(Boolean).join(' ')}>
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          className={classNames?.item}
          classNames={classNames}
        />
      ))}
    </div>
  )
}
