import { memo, useCallback, useLayoutEffect, useRef } from 'react'
import type { KeyboardEvent, ReactNode, Ref } from 'react'

export type ChatInputClassNames = {
  root?: string
  textarea?: string
  topAddons?: string
  bottomAddons?: string
}

export type ChatInputProps = {
  value?: string
  onInput?: (value: string) => void
  onSend?: () => void
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

  return (
    <div className={[classNames?.root, className].filter(Boolean).join(' ')}>
      {topAddons ? <div className={classNames?.topAddons}>{topAddons}</div> : null}
      <textarea
        ref={setTextareaRef}
        className={classNames?.textarea}
        value={value ?? ''}
        onChange={(event) => { onInput?.(event.target.value) }}
        onKeyDown={handleKeyDown}
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
