import type { ChatMessage } from '../../hooks/use-chat.js'
import { getTextContent } from '../../hooks/use-chat.js'

type MessageListClassNames = {
  root?: string
  item?: string
  user?: string
  assistant?: string
  tool?: string
}

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
    <ul className={[classNames?.root, className].filter(Boolean).join(' ')}>
      {messages.map((message) => {
        const roleClass = message.role === 'user'
          ? classNames?.user
          : message.role === 'assistant'
            ? classNames?.assistant
            : classNames?.tool

        return (
          <li
            key={message.id}
            className={[classNames?.item, roleClass].filter(Boolean).join(' ')}
          >
            <strong>{message.role}: </strong>
            <span>{getTextContent(message)}</span>
          </li>
        )
      })}
    </ul>
  )
}
