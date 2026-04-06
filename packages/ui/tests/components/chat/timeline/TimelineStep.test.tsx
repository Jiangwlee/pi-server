// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { TimelineStep } from '../../../../src/components/chat/timeline/TimelineStep.js'
import type { ToolCall } from '../../../../src/client/types.js'

afterEach(() => {
  cleanup()
})

const makeToolCall = (name = 'some_tool', id = 'tc-1'): ToolCall => ({
  type: 'toolCall',
  id,
  name,
  arguments: { command: 'ls' },
})

describe('TimelineStep', () => {
  it('renders tool name in header', () => {
    render(
      <TimelineStep
        toolCall={makeToolCall('read_file')}
        state="complete"
      />,
    )
    const matches = screen.getAllByText('read_file')
    expect(matches.length).toBeGreaterThanOrEqual(1)
    const headerSpan = matches.find((el) => el.className.includes('text-sm'))
    expect(headerSpan).toBeTruthy()
  })

  it('renders content when inprogress (expanded by default)', () => {
    render(
      <TimelineStep
        toolCall={makeToolCall()}
        state="inprogress"
      />,
    )
    const stepContent = screen.getByTestId('timeline-step-content')
    // Content should be present (inprogress = expanded)
    const pre = stepContent.querySelector('pre')
    expect(pre).toBeTruthy()
  })

  it('collapses content when complete (collapsed by default)', () => {
    render(
      <TimelineStep
        toolCall={makeToolCall()}
        state="complete"
      />,
    )
    const stepContent = screen.getByTestId('timeline-step-content')
    // Content should be hidden (complete = collapsed)
    const pre = stepContent.querySelector('pre')
    expect(pre).toBeNull()
  })

  it('toggles content on header button click', () => {
    render(
      <TimelineStep
        toolCall={makeToolCall()}
        state="complete"
      />,
    )
    // Collapsed by default
    const stepContent = screen.getByTestId('timeline-step-content')
    expect(stepContent.querySelector('pre')).toBeNull()

    // Click to expand
    const toggle = screen.getByRole('button', { name: /expand/i })
    fireEvent.click(toggle)
    expect(stepContent.querySelector('pre')).toBeTruthy()

    // Click to collapse
    const collapse = screen.getByRole('button', { name: /collapse/i })
    fireEvent.click(collapse)
    expect(stepContent.querySelector('pre')).toBeNull()
  })

  it('passes isFirst/isLast to rail connectors', () => {
    const { rerender } = render(
      <TimelineStep
        toolCall={makeToolCall()}
        state="inprogress"
        isFirst={true}
        isLast={false}
      />,
    )

    const topConnector = screen.getByTestId('rail-top-connector')
    expect(topConnector.getAttribute('data-visible')).toBe('false')
    const bottomConnector = screen.getByTestId('rail-bottom-connector')
    expect(bottomConnector.getAttribute('data-visible')).toBe('true')

    rerender(
      <TimelineStep
        toolCall={makeToolCall()}
        state="complete"
        isFirst={false}
        isLast={true}
      />,
    )

    const topConnector2 = screen.getByTestId('rail-top-connector')
    expect(topConnector2.getAttribute('data-visible')).toBe('true')
    expect(screen.queryByTestId('rail-bottom-connector')).toBeNull()
  })

  it('renders within a flex container', () => {
    render(
      <TimelineStep toolCall={makeToolCall()} state="inprogress" />,
    )
    const step = screen.getByTestId('timeline-step')
    expect(step.className).toContain('flex')
  })

  it('uses error background for error state', () => {
    render(
      <TimelineStep toolCall={makeToolCall()} state="error" />,
    )
    const surface = screen.getByTestId('timeline-surface')
    expect(surface.style.backgroundColor).toContain('--tl-status-error-00')
  })
})
