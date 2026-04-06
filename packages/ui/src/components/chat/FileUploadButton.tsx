import { memo, useCallback, useRef } from 'react'

export type FileUploadButtonClassNames = {
  root?: string
  button?: string
  input?: string
}

const defaults = {
  button: 'border-none bg-transparent py-1 px-2 font-inherit text-lg cursor-pointer disabled:opacity-40 disabled:cursor-default',
}

export type FileUploadButtonProps = {
  onFiles?: (files: File[]) => void
  disabled?: boolean
  className?: string
  classNames?: FileUploadButtonClassNames
  accept?: string
  label?: string
}

export const FileUploadButton = memo(function FileUploadButton(
  {
    onFiles,
    disabled,
    className,
    classNames,
    accept = 'image/jpeg,image/png,image/gif,image/webp',
    label = '📎',
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
        {label}
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
