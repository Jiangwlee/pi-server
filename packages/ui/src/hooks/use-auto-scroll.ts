import { useCallback, useEffect, useRef, useState } from 'react'

type UseAutoScrollOptions = {
  /** Pixel threshold from bottom to consider "at bottom" */
  threshold?: number
}

type UseAutoScrollResult = {
  /** Ref to attach to the scrollable container */
  scrollRef: React.RefObject<HTMLElement | null>
  /** Whether the user is near the bottom */
  isAtBottom: boolean
  /** Programmatically scroll to bottom */
  scrollToBottom: () => void
}

export function useAutoScroll(
  deps: unknown[],
  options: UseAutoScrollOptions = {},
): UseAutoScrollResult {
  const { threshold = 50 } = options
  const scrollRef = useRef<HTMLElement | null>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const userScrolledRef = useRef(false)

  const checkIsAtBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold
  }, [threshold])

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    userScrolledRef.current = false
    el.scrollTop = el.scrollHeight
    setIsAtBottom(true)
  }, [])

  // Listen for user scroll events
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const handleScroll = () => {
      const atBottom = checkIsAtBottom()
      setIsAtBottom(atBottom)
      if (!atBottom) {
        userScrolledRef.current = true
      } else {
        userScrolledRef.current = false
      }
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [checkIsAtBottom])

  // Auto-scroll when deps change, if user hasn't scrolled up
  useEffect(() => {
    if (!userScrolledRef.current) {
      scrollToBottom()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { scrollRef, isAtBottom, scrollToBottom }
}
