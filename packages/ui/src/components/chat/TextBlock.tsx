import { memo } from 'react'
import type { TextContent } from '../../client/types.js'
import { MarkdownRenderer } from './markdown/index.js'

export const TextBlock = memo(function TextBlock(
  {
    content,
    streaming,
    className,
  }: {
    content: TextContent
    streaming?: boolean
    className?: string
  },
) {
  return (
    <div className={className}>
      <MarkdownRenderer streaming={streaming}>{content.text}</MarkdownRenderer>
      {streaming ? <span className="streaming-cursor">▍</span> : null}
    </div>
  )
})
