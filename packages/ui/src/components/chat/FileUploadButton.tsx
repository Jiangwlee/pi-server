import { memo, useCallback, useRef } from 'react'
import { SvgPaperclip } from '../icons/index.js'

export type FileUploadButtonClassNames = {
  root?: string
  button?: string
  input?: string
}

const defaults = {
  button: 'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border-none bg-transparent text-text-secondary cursor-pointer transition-colors duration-fast hover:bg-hover hover:text-text-primary disabled:opacity-40 disabled:cursor-default',
}

export type FileUploadButtonProps = {
  onFiles?: (files: File[]) => void
  disabled?: boolean
  className?: string
  classNames?: FileUploadButtonClassNames
  accept?: string
}

export const FileUploadButton = memo(function FileUploadButton(
  {
    onFiles,
    disabled,
    className,
    classNames,
    accept = 'image/jpeg,image/png,image/gif,image/webp',
  }: FileUploadButtonProps,
) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleChange = useCallback(() => {
    const input = inputRef.current
    if (!input?.files?.length) return
    const fileList = Array.from(input.files)
    onFiles?.(fileList)
    input.value = ''
  }, [onFiles])

  return (
    <div className={[classNames?.root, className].filter(Boolean).join(' ')}>
      <button
        type="button"
        className={classNames?.button ?? defaults.button}
        onClick={handleClick}
        disabled={disabled}
        aria-label="Upload file"
      >
        <SvgPaperclip size={16} />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleChange}
        className={classNames?.input}
        style={{ display: 'none' }}
      />
    </div>
  )
})
