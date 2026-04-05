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
      className={[classNames?.root, className].filter(Boolean).join(' ')}
      style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        padding: '8px 0',
      }}
    >
      {files.map((file) => (
        <div
          key={file.id}
          className={classNames?.item}
          style={{
            position: 'relative',
            width: 64,
            height: 64,
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid rgba(128, 128, 128, 0.2)',
          }}
        >
          <img
            src={thumbnailUrl ? thumbnailUrl(file.id) : file.thumbnailUrl}
            alt={file.fileName}
            className={classNames?.thumbnail}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          {onRemove ? (
            <button
              type="button"
              className={classNames?.removeButton}
              onClick={() => onRemove(file.id)}
              aria-label={`Remove ${file.fileName}`}
              style={{
                position: 'absolute',
                top: 2,
                right: 2,
                width: 18,
                height: 18,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(0, 0, 0, 0.5)',
                color: '#fff',
                fontSize: 12,
                lineHeight: '18px',
                textAlign: 'center',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              ×
            </button>
          ) : null}
        </div>
      ))}
    </div>
  )
})
