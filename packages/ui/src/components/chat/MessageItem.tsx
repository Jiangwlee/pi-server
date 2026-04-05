import { memo } from 'react'
import type { ChatMessage } from '../../client/types.js'
import { ImageBlock } from './ImageBlock.js'
import { TextBlock } from './TextBlock.js'
import { ThinkingBlock } from './ThinkingBlock.js'
import { ToolCallBlock } from './ToolCallBlock.js'
import { ToolResultBlock } from './ToolResultBlock.js'

export type MessageItemClassNames = {
  root?: string
  user?: string
  assistant?: string
  tool?: string
  textBlock?: string
  thinkingBlock?: string
  toolCallBlock?: string
  imageBlock?: string
  attachments?: string
  attachmentThumbnail?: string
}

function renderUsage(message: ChatMessage) {
  if (!message.usage || message.streaming) return null
  return (
    <div>
      Usage: in {message.usage.input}, out {message.usage.output}, total {message.usage.totalTokens}
    </div>
  )
}

function renderStopReason(message: ChatMessage) {
  if (message.stopReason === 'error') return <div>Error</div>
  if (message.stopReason === 'aborted') return <div>Aborted</div>
  return null
}

export const MessageItem = memo(function MessageItem({
  message,
  toolResultsByCallId,
  className,
  classNames,
}: {
  message: ChatMessage
  toolResultsByCallId?: Map<string, ChatMessage>
  className?: string
  classNames?: MessageItemClassNames
}) {
  const roleClass = message.role === 'user'
    ? classNames?.user
    : message.role === 'assistant'
      ? classNames?.assistant
      : classNames?.tool

  const rootClassName = [classNames?.root, roleClass, className].filter(Boolean).join(' ')

  if (message.role === 'user') {
    const userText = message.content
      .filter((content) => content.type === 'text')
      .map((content) => content.text)
      .join('')
    return (
      <div className={rootClassName}>
        {message.attachments && message.attachments.length > 0 ? (
          <div
            className={classNames?.attachments}
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}
          >
            {message.attachments.map((att) => (
              <img
                key={att.fileId}
                src={att.thumbnailUrl}
                alt={att.fileName}
                className={classNames?.attachmentThumbnail}
                style={{
                  width: 64,
                  height: 64,
                  objectFit: 'cover',
                  borderRadius: 8,
                  border: '1px solid rgba(128, 128, 128, 0.2)',
                }}
              />
            ))}
          </div>
        ) : null}
        <TextBlock
          content={{ type: 'text', text: userText }}
          streaming={message.streaming}
          className={classNames?.textBlock}
        />
        {renderUsage(message)}
        {renderStopReason(message)}
      </div>
    )
  }

  if (message.role === 'tool') {
    return (
      <div className={rootClassName}>
        <ToolResultBlock message={message} />
        {renderUsage(message)}
        {renderStopReason(message)}
      </div>
    )
  }

  return (
    <div className={rootClassName}>
      {message.content.map((content, index) => {
        if (content.type === 'text') {
          return (
            <TextBlock
              key={`${message.id}-text-${index}`}
              content={content}
              streaming={message.streaming}
              className={classNames?.textBlock}
            />
          )
        }
        if (content.type === 'thinking') {
          return (
            <ThinkingBlock
              key={`${message.id}-thinking-${index}`}
              content={content}
              streaming={message.streaming}
              className={classNames?.thinkingBlock}
            />
          )
        }
        if (content.type === 'toolCall') {
          const result = toolResultsByCallId?.get(content.id)
          return (
            <ToolCallBlock
              key={`${message.id}-toolCall-${index}`}
              toolCall={content}
              result={result}
              streaming={message.streaming}
              className={classNames?.toolCallBlock}
            />
          )
        }
        if (content.type === 'image') {
          return (
            <ImageBlock
              key={`${message.id}-image-${index}`}
              content={content}
              className={classNames?.imageBlock}
            />
          )
        }
        return null
      })}
      {renderUsage(message)}
      {renderStopReason(message)}
    </div>
  )
})
