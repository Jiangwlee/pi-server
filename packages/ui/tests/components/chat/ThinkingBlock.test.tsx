// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, act, within } from '@testing-library/react'
import { ThinkingBlock } from '../../../src/components/chat/ThinkingBlock.js'

describe('ThinkingBlock', () => {
  it('is collapsed by default and shows "Thought"', () => {
    const { container } = render(
      <ThinkingBlock content={{ type: 'thinking', thinking: 'internal' }} />,
    )
    const scope = within(container)
    expect(scope.getByText('Thought')).toBeTruthy()
    expect(scope.queryByText('internal')).toBeNull()
  })

  it('toggles on header click', () => {
    const { container } = render(
      <ThinkingBlock content={{ type: 'thinking', thinking: 'internal' }} />,
    )
    const scope = within(container)
    const header = scope.getByRole('button')

    fireEvent.click(header)
    expect(scope.getByText('internal')).toBeTruthy()

    fireEvent.click(header)
    expect(scope.queryByText('internal')).toBeNull()
  })

  it('shows redacted text when content is redacted', () => {
    const { container } = render(
      <ThinkingBlock content={{ type: 'thinking', thinking: 'secret', redacted: true }} defaultExpanded />,
    )
    const scope = within(container)
    expect(scope.getByText('[Redacted]')).toBeTruthy()
    expect(scope.queryByText('secret')).toBeNull()
  })

  it('is always expanded while streaming and shows "Thinking..."', () => {
    const { container } = render(
      <ThinkingBlock content={{ type: 'thinking', thinking: 'streaming thought' }} streaming />,
    )
    const scope = within(container)
    expect(scope.getByText('Thinking...')).toBeTruthy()
    expect(scope.getByText('streaming thought')).toBeTruthy()

    // Click should not collapse while streaming
    fireEvent.click(scope.getByRole('button'))
    expect(scope.getByText('streaming thought')).toBeTruthy()
  })

  it('shows chevron ▶ when collapsed and ▼ when expanded', () => {
    const { container } = render(
      <ThinkingBlock content={{ type: 'thinking', thinking: 'hello' }} />,
    )
    const scope = within(container)

    // Collapsed: right chevron
    expect(scope.getByText('▶')).toBeTruthy()
    expect(scope.queryByText('▼')).toBeNull()

    // Expand
    fireEvent.click(scope.getByRole('button'))

    // Expanded: down chevron
    expect(scope.getByText('▼')).toBeTruthy()
    expect(scope.queryByText('▶')).toBeNull()
  })

  it('shows "Thought" without duration when elapsed is 0 (history messages)', () => {
    const { container } = render(
      <ThinkingBlock content={{ type: 'thinking', thinking: 'past thought' }} />,
    )
    const scope = within(container)
    expect(scope.getByText('Thought')).toBeTruthy()
    expect(scope.queryByText(/Thought for/)).toBeNull()
  })

  describe('duration timer', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('increments elapsed time while streaming', () => {
      const now = Date.now()
      vi.setSystemTime(now)

      const { container } = render(
        <ThinkingBlock content={{ type: 'thinking', thinking: 'deep thought' }} streaming />,
      )
      const scope = within(container)

      // Initially no duration shown (elapsed = 0)
      expect(scope.queryByText(/\d+s/)).toBeNull()

      // Advance 3 seconds — each tick the interval fires and reads Date.now()
      act(() => {
        vi.setSystemTime(now + 3000)
        vi.advanceTimersByTime(3000)
      })

      // Should show some positive elapsed value
      const btn = scope.getByRole('button')
      expect(btn.textContent).toMatch(/\(\d+s\)/)

      // Advance more
      act(() => {
        vi.setSystemTime(now + 6000)
        vi.advanceTimersByTime(3000)
      })

      // Elapsed should have increased
      const match = btn.textContent?.match(/\((\d+)s\)/)
      expect(match).toBeTruthy()
      expect(Number(match![1])).toBeGreaterThanOrEqual(5)
    })

    it('freezes elapsed when streaming stops and shows "Thought for Xs"', () => {
      const now = Date.now()
      vi.setSystemTime(now)

      const { container, rerender } = render(
        <ThinkingBlock content={{ type: 'thinking', thinking: 'deep thought' }} streaming />,
      )
      const scope = within(container)

      // Advance 4 seconds
      act(() => {
        vi.setSystemTime(now + 4000)
        vi.advanceTimersByTime(4000)
      })

      const btn = scope.getByRole('button')
      // Should show duration while streaming
      expect(btn.textContent).toMatch(/\(\d+s\)/)

      // Stop streaming
      rerender(
        <ThinkingBlock content={{ type: 'thinking', thinking: 'deep thought' }} />,
      )

      // Should show "Thought for Xs"
      expect(btn.textContent).toMatch(/Thought for \d+s/)

      // Capture the frozen value
      const frozenText = btn.textContent

      // Advance more time - should stay frozen
      act(() => {
        vi.setSystemTime(now + 10000)
        vi.advanceTimersByTime(6000)
      })
      expect(btn.textContent).toBe(frozenText)
    })
  })
})
