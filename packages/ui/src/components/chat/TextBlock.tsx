import { memo } from 'react'
import type { TextContent } from '../../client/types.js'

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
    <div className={className} style={{ whiteSpace: 'pre-wrap' }}>
      {content.text}
      {streaming ? <span className="streaming-cursor">▍</span> : null}
    </div>
  )
})
