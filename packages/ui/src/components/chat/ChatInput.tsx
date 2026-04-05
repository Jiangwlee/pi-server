import { memo, useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { ClipboardEvent, DragEvent, KeyboardEvent, ReactNode, Ref } from 'react'

export type ChatInputClassNames = {
  root?: string
  textarea?: string
  topAddons?: string
  bottomAddons?: string
  dragOverlay?: string
}

export type ChatInputProps = {
  value?: string
  onInput?: (value: string) => void
  onSend?: () => void
  onFiles?: (files: File[]) => void
  loading?: boolean
  placeholder?: string
  disabled?: boolean
  className?: string
  classNames?: ChatInputClassNames
  topAddons?: ReactNode
  bottomAddons?: ReactNode
  minRows?: number
  maxRows?: number
  ref?: Ref<HTMLTextAreaElement>
}

export const ChatInput = memo(function ChatInput(
  {
    value,
    onInput,
    onSend,
    onFiles,
    loading,
    placeholder,
    disabled,
    className,
    classNames,
    topAddons,
    bottomAddons,
    minRows = 1,
    maxRows = 6,
    ref,
  }: ChatInputProps,
) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const composingRef = useRef(false)
  const dragCounterRef = useRef(0)
  const [isDragging, setIsDragging] = useState(false)

  const setTextareaRef = useCallback((element: HTMLTextAreaElement | null) => {
    textareaRef.current = element
    if (!ref) return
    if (typeof ref === 'function') {
      ref(element)
      return
    }
    ref.current = element
  }, [ref])

  const adjustHeight = useCallback(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    const lineHeight = 24
    const minHeight = minRows * lineHeight
    const maxHeight = maxRows * lineHeight
    const nextHeight = Math.min(Math.max(element.scrollHeight, minHeight), maxHeight)
    element.style.height = `${nextHeight}px`
  }, [maxRows, minRows])

  useLayoutEffect(() => {
    adjustHeight()
  }, [adjustHeight, value])

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter') return
    if (event.shiftKey) return
    if (composingRef.current) return
    if (loading || disabled) return

    event.preventDefault()
    onSend?.()
  }, [loading, disabled, onSend])

  const handlePaste = useCallback((event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!onFiles) return
    const items = event.clipboardData?.items
    if (!items) return

    const imageFiles: File[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) imageFiles.push(file)
      }
    }

    if (imageFiles.length > 0) {
      event.preventDefault()
      onFiles(imageFiles)
    }
  }, [onFiles])

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!onFiles) return
    if (!event.dataTransfer?.types.includes('Files')) return
    event.preventDefault()
  }, [onFiles])

  const handleDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!onFiles) return
    if (!event.dataTransfer?.types.includes('Files')) return
    event.preventDefault()
    dragCounterRef.current += 1
    if (dragCounterRef.current === 1) setIsDragging(true)
  }, [onFiles])

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!onFiles) return
    event.preventDefault()
    dragCounterRef.current -= 1
    if (dragCounterRef.current === 0) setIsDragging(false)
  }, [onFiles])

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!onFiles) return
    event.preventDefault()
    dragCounterRef.current = 0
    setIsDragging(false)

    const files = Array.from(event.dataTransfer?.files ?? [])
    if (files.length > 0) onFiles(files)
  }, [onFiles])

  return (
    <div
      className={[classNames?.root, className].filter(Boolean).join(' ')}
      style={{ position: 'relative' }}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging ? (
        <div
          className={classNames?.dragOverlay}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'inherit',
            border: '2px dashed currentColor',
            background: 'rgba(128, 128, 128, 0.1)',
            pointerEvents: 'none',
            opacity: 0.8,
          }}
        >
          Drop files here
        </div>
      ) : null}
      {topAddons ? <div className={classNames?.topAddons}>{topAddons}</div> : null}
      <textarea
        ref={setTextareaRef}
        className={classNames?.textarea}
        value={value ?? ''}
        onChange={(event) => { onInput?.(event.target.value) }}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onCompositionStart={() => { composingRef.current = true }}
        onCompositionEnd={() => { composingRef.current = false }}
        placeholder={placeholder}
        disabled={disabled}
        rows={minRows}
      />

      {bottomAddons ? <div className={classNames?.bottomAddons}>{bottomAddons}</div> : null}
    </div>
  )
})
