import { memo, useState } from 'react'
import type { ToolCall } from '../../client/types.js'

export const ToolCallBlock = memo(function ToolCallBlock(
  {
    toolCall,
    className,
  }: {
    toolCall: ToolCall
    className?: string
  },
) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={className}>
      <button type="button" onClick={() => setExpanded((prev) => !prev)}>
        {toolCall.name || 'Tool Call'}
      </button>
      {expanded ? (
        <pre style={{ whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(toolCall.arguments ?? {}, null, 2)}
        </pre>
      ) : null}
    </div>
  )
})
