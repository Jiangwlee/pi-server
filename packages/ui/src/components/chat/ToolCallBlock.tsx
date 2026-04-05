import { memo } from 'react'
import type { ChatMessage, ToolCall } from '../../client/types.js'
import { renderTool } from '../../tools/index.js'

export type ToolCallBlockClassNames = {
  root?: string
  card?: string
}

export const ToolCallBlock = memo(function ToolCallBlock({
  toolCall,
  result,
  streaming,
  className,
  classNames,
}: {
  toolCall: ToolCall
  result?: ChatMessage
  streaming?: boolean
  className?: string
  classNames?: ToolCallBlockClassNames
}) {
  const { content, custom } = renderTool(toolCall, result, streaming)

  if (custom) {
    return <div className={[classNames?.root, className].filter(Boolean).join(' ')}>{content}</div>
  }

  return (
    <div className={[classNames?.root, className].filter(Boolean).join(' ')}>
      <div
        className={classNames?.card}
        style={{
          padding: '10px 12px',
          border: '1px solid var(--color-border, rgba(128, 128, 128, 0.15))',
          borderRadius: 8,
          background: 'var(--color-card-bg, rgba(128, 128, 128, 0.03))',
        }}
      >
        {content}
      </div>
    </div>
  )
})
