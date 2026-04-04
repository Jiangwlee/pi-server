import { memo } from 'react'
import type { ImageContent } from '../../client/types.js'

export const ImageBlock = memo(function ImageBlock(
  {
    content,
    className,
  }: {
    content: ImageContent
    className?: string
  },
) {
  return (
    <img
      className={className}
      src={`data:${content.mimeType};base64,${content.data}`}
      alt="message image"
    />
  )
})
