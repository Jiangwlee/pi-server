// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, act, within } from '@testing-library/react'
import { StreamingHeader } from '../../../../src/components/chat/timeline/StreamingHeader.js'
import { CompletedHeader } from '../../../../src/components/chat/timeline/CompletedHeader.js'

describe('StreamingHeader', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders tool name text', () => {
    const now = Date.now()
    vi.setSystemTime(now)

    const { container } = render(
      <StreamingHeader toolName="bash" startTime={now} isExpanded={true} onToggle={() => {}} />,
    )
    const scope = within(container)
    expect(scope.getByText(/Executing bash/)).toBeTruthy()
  })

  it('shows elapsed time after interval ticks', () => {
    const now = Date.now()
    vi.setSystemTime(now)

    const { container } = render(
      <StreamingHeader toolName="bash" startTime={now} isExpanded={true} onToggle={() => {}} />,
    )

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(container.textContent).toMatch(/\d+s/)
  })

  it('onToggle callback fires on button click', () => {
    const now = Date.now()
    vi.setSystemTime(now)
    const onToggle = vi.fn()

    const { container } = render(
      <StreamingHeader toolName="bash" startTime={now} isExpanded={true} onToggle={onToggle} />,
    )
    const scope = within(container)
    const btn = scope.getByRole('button')
    fireEvent.click(btn)
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('renders fold/expand icon svgs', () => {
    const now = Date.now()
    vi.setSystemTime(now)

    const { container, rerender } = render(
      <StreamingHeader toolName="bash" startTime={now} isExpanded={true} onToggle={() => {}} />,
    )
    // Expanded: fold icon (chevron up, points "18 15 12 9 6 15")
    const svg = container.querySelector('button svg')!
    const polyline = svg.querySelector('polyline')!
    expect(polyline.getAttribute('points')).toContain('18 15 12 9 6 15')

    rerender(
      <StreamingHeader toolName="bash" startTime={now} isExpanded={false} onToggle={() => {}} />,
    )
    // Collapsed: expand icon (chevron down, points "6 9 12 15 18 9")
    const svg2 = container.querySelector('button svg')!
    const polyline2 = svg2.querySelector('polyline')!
    expect(polyline2.getAttribute('points')).toContain('6 9 12 15 18 9')
  })
})

describe('CompletedHeader', () => {
  it('renders duration and step count', () => {
    const { container } = render(
      <CompletedHeader totalSteps={3} durationSeconds={5} isExpanded={false} onToggle={() => {}} />,
    )
    expect(container.textContent).toMatch(/Thought for 5 seconds/)
    expect(container.textContent).toMatch(/3 steps/)
  })

  it('onToggle fires on click', () => {
    const onToggle = vi.fn()
    const { container } = render(
      <CompletedHeader totalSteps={2} durationSeconds={10} isExpanded={false} onToggle={onToggle} />,
    )
    // Click the outer div (role="button")
    const outerButton = container.querySelector('[role="button"]')!
    fireEvent.click(outerButton)
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('renders fold/expand icon svgs', () => {
    const { container, rerender } = render(
      <CompletedHeader totalSteps={2} durationSeconds={3} isExpanded={true} onToggle={() => {}} />,
    )
    // Expanded: fold icon (chevron up)
    const svg = container.querySelector('button svg')!
    const polyline = svg.querySelector('polyline')!
    expect(polyline.getAttribute('points')).toContain('18 15 12 9 6 15')

    rerender(
      <CompletedHeader totalSteps={2} durationSeconds={3} isExpanded={false} onToggle={() => {}} />,
    )
    // Collapsed: expand icon (chevron down)
    const svg2 = container.querySelector('button svg')!
    const polyline2 = svg2.querySelector('polyline')!
    expect(polyline2.getAttribute('points')).toContain('6 9 12 15 18 9')
  })
})
