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
    const scope = within(container)

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    // After 3 seconds of fake-timer advancement, elapsed should be positive
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

  it('shows ▼ when expanded and ▶ when collapsed', () => {
    const now = Date.now()
    vi.setSystemTime(now)

    const { container, rerender } = render(
      <StreamingHeader toolName="bash" startTime={now} isExpanded={true} onToggle={() => {}} />,
    )
    const scope = within(container)
    expect(scope.getByText('▼')).toBeTruthy()

    rerender(
      <StreamingHeader toolName="bash" startTime={now} isExpanded={false} onToggle={() => {}} />,
    )
    expect(scope.getByText('▶')).toBeTruthy()
  })
})

describe('CompletedHeader', () => {
  it('renders summary text with correct format', () => {
    const { container } = render(
      <CompletedHeader totalSteps={3} durationSeconds={5} isExpanded={false} onToggle={() => {}} />,
    )
    const scope = within(container)
    expect(scope.getByText(/Used 3 tools \(5s\)/)).toBeTruthy()
  })

  it('onToggle fires on click (entire header is clickable)', () => {
    const onToggle = vi.fn()
    const { container } = render(
      <CompletedHeader totalSteps={2} durationSeconds={10} isExpanded={false} onToggle={onToggle} />,
    )
    const scope = within(container)
    const header = scope.getByRole('button')
    fireEvent.click(header)
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('shows ▼ when expanded and ▶ when collapsed', () => {
    const { container, rerender } = render(
      <CompletedHeader totalSteps={2} durationSeconds={3} isExpanded={true} onToggle={() => {}} />,
    )
    const scope = within(container)
    expect(scope.getByText('▼')).toBeTruthy()

    rerender(
      <CompletedHeader totalSteps={2} durationSeconds={3} isExpanded={false} onToggle={() => {}} />,
    )
    expect(scope.getByText('▶')).toBeTruthy()
  })
})
