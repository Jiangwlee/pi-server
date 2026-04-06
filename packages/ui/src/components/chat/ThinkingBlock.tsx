import { memo, useState } from 'react'
import type { ThinkingContent } from '../../client/types.js'

export type ThinkingBlockClassNames = {
  root?: string
  toggle?: string
  content?: string
}

const defaults = {
  content: 'whitespace-pre-wrap',
}

export const ThinkingBlock = memo(function ThinkingBlock(
  {
    content,
    streaming,
    className,
    classNames,
    defaultExpanded,
  }: {
    content: ThinkingContent
    streaming?: boolean
    className?: string
    classNames?: ThinkingBlockClassNames
    defaultExpanded?: boolean
  },
) {
  const [expanded, setExpanded] = useState(Boolean(defaultExpanded))

  // Streaming forces expanded; user toggle only applies when not streaming
  const isExpanded = streaming ? true : expanded

  return (
    <div className={[classNames?.root, className].filter(Boolean).join(' ')}>
      <button
        type="button"
        className={[streaming ? 'thinking-streaming' : undefined, classNames?.toggle].filter(Boolean).join(' ') || undefined}
        onClick={() => {
          if (streaming) return
          setExpanded((prev) => !prev)
        }}
      >
        Thinking...
      </button>
      {isExpanded ? (
        <div className={classNames?.content ?? defaults.content}>
          {content.redacted ? '[Redacted]' : content.thinking}
        </div>
      ) : null}
    </div>
  )
})
