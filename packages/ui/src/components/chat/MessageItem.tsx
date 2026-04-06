import type { ReactNode } from 'react'
import { memo } from 'react'
import type { ChatMessage } from '../../client/types.js'
import { ImageBlock } from './ImageBlock.js'
import { MessageToolbar } from './MessageToolbar.js'
import { TextBlock } from './TextBlock.js'
import { ThinkingBlock } from './ThinkingBlock.js'
import { ToolCallBlock } from './ToolCallBlock.js'
import { ToolResultBlock } from './ToolResultBlock.js'

export type MessageItemClassNames = {
  root?: string
  content?: string
  avatar?: string
  user?: string
  assistant?: string
  tool?: string
  textBlock?: string
  thinkingBlock?: string
  toolCallBlock?: string
  imageBlock?: string
  attachments?: string
  attachmentThumbnail?: string
  metadata?: string
  toolbar?: string
}

const defaults = {
  root: 'flex gap-3',
  contentUser: 'max-w-[37.5rem] rounded-2xl rounded-br-md bg-accent-soft px-4 py-2.5',
  contentAssistant: 'max-w-[52.5rem]',
  contentTool: 'max-w-[52.5rem]',
  avatar: 'w-8 h-8 rounded-full flex-shrink-0',
  metadata: 'text-xs text-muted mt-1',
  attachments: 'flex gap-2 flex-wrap mb-2',
  attachmentThumbnail: 'w-16 h-16 object-cover rounded-lg border border-border',
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

function extractText(message: ChatMessage): string {
  return message.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('')
}

function renderMetadata(message: ChatMessage, classNames?: MessageItemClassNames) {
  const usage = renderUsage(message)
  const stopReason = renderStopReason(message)
  if (!usage && !stopReason) return null
  return (
    <div className={classNames?.metadata ?? defaults.metadata}>
      {usage}
      {stopReason}
    </div>
  )
}

export const MessageItem = memo(function MessageItem({
  message,
  toolResultsByCallId,
  renderAvatar,
  onCopy,
  onRegenerate,
  className,
  classNames,
}: {
  message: ChatMessage
  toolResultsByCallId?: Map<string, ChatMessage>
  renderAvatar?: (message: ChatMessage) => ReactNode
  onCopy?: (message: ChatMessage) => void
  onRegenerate?: (message: ChatMessage) => void
  className?: string
  classNames?: MessageItemClassNames
}) {
  const roleClass = message.role === 'user'
    ? classNames?.user
    : message.role === 'assistant'
      ? classNames?.assistant
      : classNames?.tool

  const rootClassName = [classNames?.root ?? defaults.root, roleClass, className].filter(Boolean).join(' ')

  if (message.role === 'user') {
    const userText = message.content
      .filter((content) => content.type === 'text')
      .map((content) => content.text)
      .join('')

    const contentClass = classNames?.content ?? defaults.contentUser

    return (
      <div className={rootClassName} data-role="user">
        {renderAvatar?.(message)}
        <div className="flex flex-col">
          <div className={contentClass}>
            {message.attachments && message.attachments.length > 0 ? (
              <div className={classNames?.attachments ?? defaults.attachments}>
                {message.attachments.map((att) => (
                  <img
                    key={att.fileId}
                    src={att.thumbnailUrl}
                    alt={att.fileName}
                    className={classNames?.attachmentThumbnail ?? defaults.attachmentThumbnail}
                  />
                ))}
              </div>
            ) : null}
            <TextBlock
              content={{ type: 'text', text: userText }}
              streaming={message.streaming}
              className={classNames?.textBlock}
            />
          </div>
          {renderMetadata(message, classNames)}
        </div>
      </div>
    )
  }

  if (message.role === 'tool') {
    const contentClass = classNames?.content ?? defaults.contentTool

    return (
      <div className={rootClassName} data-role="tool">
        <div className="flex flex-col">
          <div className={contentClass}>
            <ToolResultBlock message={message} />
          </div>
          {renderMetadata(message, classNames)}
        </div>
      </div>
    )
  }

  const contentClass = classNames?.content ?? defaults.contentAssistant

  return (
    <div className={rootClassName} data-role="assistant">
      {renderAvatar?.(message)}
      <div className="flex flex-col min-w-0">
        <div className={contentClass}>
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
        </div>
        {(onCopy || onRegenerate) ? (
          <MessageToolbar
            text={extractText(message)}
            onCopy={onCopy ? () => onCopy(message) : undefined}
            onRegenerate={onRegenerate ? () => onRegenerate(message) : undefined}
            className={classNames?.toolbar}
          />
        ) : null}
        {renderMetadata(message, classNames)}
      </div>
    </div>
  )
})
