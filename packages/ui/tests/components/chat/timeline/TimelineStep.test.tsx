// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { TimelineStep } from '../../../../src/components/chat/timeline/TimelineStep.js'
import type { ToolCall } from '../../../../src/client/types.js'

afterEach(() => {
  cleanup()
})

const makeToolCall = (name = 'bash', id = 'tc-1'): ToolCall => ({
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
        isExpanded={true}
      />,
    )
    // Tool name appears in our header span AND in ToolCallBlock's ToolHeader
    const matches = screen.getAllByText('read_file')
    expect(matches.length).toBeGreaterThanOrEqual(1)
    // Our header span should be the one with text-muted class
    const headerSpan = matches.find((el) => el.className.includes('text-muted'))
    expect(headerSpan).toBeTruthy()
  })

  it('renders ToolCallBlock inside the step content body', () => {
    const tc = makeToolCall('bash')

    render(
      <TimelineStep
        toolCall={tc}
        state="inprogress"
        isExpanded={true}
      />,
    )
    // ToolCallBlock renders DefaultRenderer which includes the tool name in its header
    const stepContent = screen.getByTestId('timeline-step-content')
    // The body (px-2 pb-2 div) should contain the ToolCallBlock card
    const cardDiv = stepContent.querySelector('.border-border')
    expect(cardDiv).toBeTruthy()
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
    const bottomConnector2 = screen.getByTestId('rail-bottom-connector')
    expect(bottomConnector2.getAttribute('data-visible')).toBe('false')
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
      <TimelineStep toolCall={makeToolCall()} state="error" isExpanded={true} />,
    )
    const surface = screen.getByTestId('timeline-surface')
    expect(surface.className).toContain('bg-error')
  })
})
