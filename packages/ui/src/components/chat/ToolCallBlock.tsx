import { memo } from 'react'
import type { ChatMessage, ToolCall, RenderType } from '../../client/types.js'
import { renderTool } from './tools/index.js'

export const ToolCallBlock = memo(function ToolCallBlock({
  toolCall,
  result,
  streaming,
  className,
  renderType = 'full',
}: {
  toolCall: ToolCall
  result?: ChatMessage
  streaming?: boolean
  className?: string
  renderType?: RenderType
}) {
  const { content } = renderTool(toolCall, result, streaming, renderType)

  return (
    <div className={className}>
      {content}
    </div>
  )
})
