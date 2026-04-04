import { memo } from 'react'
import type { ChatMessage } from '../../client/types.js'
import { ImageBlock } from './ImageBlock.js'
import { TextBlock } from './TextBlock.js'

export const ToolResultBlock = memo(function ToolResultBlock(
  {
    message,
    className,
  }: {
    message: ChatMessage
    className?: string
  },
) {
  return (
    <div className={className}>
      <div>{message.toolName ?? 'Tool Result'}</div>
      {message.content.map((content, index) => {
        if (content.type === 'text') {
          return <TextBlock key={`${message.id}-text-${index}`} content={content} />
        }
        if (content.type === 'image') {
          return <ImageBlock key={`${message.id}-image-${index}`} content={content} />
        }
        return null
      })}
    </div>
  )
})
