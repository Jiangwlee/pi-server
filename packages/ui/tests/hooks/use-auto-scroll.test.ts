// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useAutoScroll } from '../../src/hooks/use-auto-scroll.js'

afterEach(() => {
  cleanup()
})

describe('useAutoScroll', () => {
  it('returns isAtBottom true by default', () => {
    const { result } = renderHook(() => useAutoScroll([]))
    expect(result.current.isAtBottom).toBe(true)
  })

  it('provides scrollRef, isAtBottom, and scrollToBottom', () => {
    const { result } = renderHook(() => useAutoScroll([]))
    expect(result.current.scrollRef).toBeDefined()
    expect(typeof result.current.isAtBottom).toBe('boolean')
    expect(typeof result.current.scrollToBottom).toBe('function')
  })

  it('scrollToBottom sets scrollTop to scrollHeight', () => {
    const { result } = renderHook(() => useAutoScroll([]))
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollHeight', { value: 1000, configurable: true })
    Object.defineProperty(el, 'scrollTop', { value: 0, configurable: true, writable: true })
    Object.defineProperty(el, 'clientHeight', { value: 500, configurable: true })

    // @ts-expect-error - assigning to ref
    result.current.scrollRef.current = el

    act(() => {
      result.current.scrollToBottom()
    })

    expect(el.scrollTop).toBe(1000)
    expect(result.current.isAtBottom).toBe(true)
  })
})
