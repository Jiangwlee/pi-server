import { memo } from 'react'
import type { UploadedFile } from '../../client/types.js'

export type AttachmentPreviewClassNames = {
  root?: string
  item?: string
  thumbnail?: string
  removeButton?: string
  fileName?: string
}

export type AttachmentPreviewProps = {
  files: UploadedFile[]
  onRemove?: (fileId: string) => void
  thumbnailUrl?: (fileId: string) => string
  className?: string
  classNames?: AttachmentPreviewClassNames
}

const defaults = {
  root: 'flex gap-2 flex-wrap py-2',
  item: 'relative w-16 h-16 rounded-lg overflow-hidden border border-border',
  thumbnail: 'w-full h-full object-cover',
  removeButton: 'absolute top-0.5 right-0.5 w-[18px] h-[18px] rounded-full border-none bg-black/50 text-white text-xs leading-[18px] text-center cursor-pointer p-0',
}

export const AttachmentPreview = memo(function AttachmentPreview(
  {
    files,
    onRemove,
    thumbnailUrl,
    className,
    classNames,
  }: AttachmentPreviewProps,
) {
  if (files.length === 0) return null

  return (
    <div
      className={[classNames?.root ?? defaults.root, className].filter(Boolean).join(' ')}
    >
      {files.map((file) => (
        <div
          key={file.id}
          className={classNames?.item ?? defaults.item}
        >
          <img
            src={thumbnailUrl ? thumbnailUrl(file.id) : file.thumbnailUrl}
            alt={file.fileName}
            className={classNames?.thumbnail ?? defaults.thumbnail}
          />
          {onRemove ? (
            <button
              type="button"
              className={classNames?.removeButton ?? defaults.removeButton}
              onClick={() => onRemove(file.id)}
              aria-label={`Remove ${file.fileName}`}
            >
              ×
            </button>
          ) : null}
        </div>
      ))}
    </div>
  )
})
