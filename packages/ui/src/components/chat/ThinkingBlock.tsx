import { memo, useState } from 'react'
import type { ThinkingContent } from '../../client/types.js'

export const ThinkingBlock = memo(function ThinkingBlock(
  {
    content,
    streaming,
    className,
    defaultExpanded,
  }: {
    content: ThinkingContent
    streaming?: boolean
    className?: string
    defaultExpanded?: boolean
  },
) {
  const [expanded, setExpanded] = useState(Boolean(defaultExpanded))

  // Streaming forces expanded; user toggle only applies when not streaming
  const isExpanded = streaming ? true : expanded

  return (
    <div className={className}>
      <button
        type="button"
        className={streaming ? 'thinking-streaming' : undefined}
        onClick={() => {
          if (streaming) return
          setExpanded((prev) => !prev)
        }}
      >
        Thinking...
      </button>
      {isExpanded ? (
        <div style={{ whiteSpace: 'pre-wrap' }}>
          {content.redacted ? '[Redacted]' : content.thinking}
        </div>
      ) : null}
    </div>
  )
})
