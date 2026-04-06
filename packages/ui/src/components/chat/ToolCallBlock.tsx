import { memo } from 'react'
import type { ChatMessage, ToolCall } from '../../client/types.js'
import { renderTool } from './tools/index.js'

export type ToolCallBlockClassNames = {
  root?: string
  card?: string
}

const defaults = {
  card: 'py-2.5 px-3 border border-border rounded-lg bg-panel',
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
        className={classNames?.card ?? defaults.card}
      >
        {content}
      </div>
    </div>
  )
})
