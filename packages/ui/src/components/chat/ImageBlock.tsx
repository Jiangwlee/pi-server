import { memo } from 'react'
import type { ImageContent } from '../../client/types.js'

export type ImageBlockClassNames = {
  root?: string
}

const defaults = {
  root: 'max-w-full rounded-lg',
}

export const ImageBlock = memo(function ImageBlock(
  {
    content,
    className,
    classNames,
  }: {
    content: ImageContent
    className?: string
    classNames?: ImageBlockClassNames
  },
) {
  return (
    <img
      className={[classNames?.root ?? defaults.root, className].filter(Boolean).join(' ')}
      src={`data:${content.mimeType};base64,${content.data}`}
      alt="message image"
    />
  )
})
