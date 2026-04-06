// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { ToolTimeline } from '../../../../src/components/chat/timeline/ToolTimeline.js'
import type { ToolCall, ToolExecution } from '../../../../src/client/types.js'
import type { ToolStep } from '../../../../src/state/group-messages.js'

afterEach(() => {
  cleanup()
})

const makeTc = (name: string, id: string): ToolCall => ({
  type: 'toolCall',
  id,
  name,
  arguments: {},
})

const makeStep = (name: string, id: string): ToolStep => ({
  toolCall: makeTc(name, id),
})

const makeExec = (
  id: string,
  name: string,
  state: 'inprogress' | 'complete' | 'error',
  startTime = 1000,
): ToolExecution => ({
  toolCallId: id,
  toolName: name,
  state,
  startTime,
})

describe('ToolTimeline', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(5000)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders StreamingHeader when any tool is inprogress', () => {
    const steps = [makeStep('bash', 'tc-1'), makeStep('read_file', 'tc-2')]
    const toolExecutions = new Map([
      ['tc-1', makeExec('tc-1', 'bash', 'complete')],
      ['tc-2', makeExec('tc-2', 'read_file', 'inprogress')],
    ])

    render(<ToolTimeline steps={steps} toolExecutions={toolExecutions} />)
    expect(screen.getByText(/Executing read_file/)).toBeTruthy()
  })

  it('renders CompletedHeader when all tools are done', () => {
    const steps = [makeStep('bash', 'tc-1'), makeStep('read_file', 'tc-2')]
    const toolExecutions = new Map([
      ['tc-1', makeExec('tc-1', 'bash', 'complete')],
      ['tc-2', makeExec('tc-2', 'read_file', 'complete')],
    ])

    render(<ToolTimeline steps={steps} toolExecutions={toolExecutions} />)
    expect(screen.getByText(/Thought for/)).toBeTruthy()
  })

  it('shows correct number of TimelineStep children when expanded', () => {
    const steps = [
      makeStep('bash', 'tc-1'),
      makeStep('read_file', 'tc-2'),
      makeStep('write_file', 'tc-3'),
    ]
    const toolExecutions = new Map([
      ['tc-1', makeExec('tc-1', 'bash', 'inprogress')],
      ['tc-2', makeExec('tc-2', 'read_file', 'inprogress')],
      ['tc-3', makeExec('tc-3', 'write_file', 'inprogress')],
    ])

    render(<ToolTimeline steps={steps} toolExecutions={toolExecutions} />)
    // Default is expanded
    const stepEls = screen.getAllByTestId('timeline-step')
    expect(stepEls).toHaveLength(3)
  })

  it('toggles expand/collapse when header button is clicked', () => {
    const steps = [makeStep('bash', 'tc-1'), makeStep('read_file', 'tc-2')]
    const toolExecutions = new Map([
      ['tc-1', makeExec('tc-1', 'bash', 'complete')],
      ['tc-2', makeExec('tc-2', 'read_file', 'complete')],
    ])

    render(<ToolTimeline steps={steps} toolExecutions={toolExecutions} />)

    // Default is expanded
    expect(screen.getAllByTestId('timeline-step')).toHaveLength(2)

    // Click to collapse
    const headers = screen.getAllByRole('button', { name: /timeline/i })
    const header = headers[0]
    fireEvent.click(header)
    expect(screen.queryAllByTestId('timeline-step')).toHaveLength(0)

    // Click to expand again
    fireEvent.click(header)
    expect(screen.getAllByTestId('timeline-step')).toHaveLength(2)
  })

  it('auto-collapses when streaming ends if user has not toggled', () => {
    const steps = [makeStep('bash', 'tc-1')]
    const streamingExecs = new Map([
      ['tc-1', makeExec('tc-1', 'bash', 'inprogress')],
    ])

    const { rerender } = render(
      <ToolTimeline steps={steps} toolExecutions={streamingExecs} />,
    )

    // Default expanded
    expect(screen.getAllByTestId('timeline-step')).toHaveLength(1)

    const completedExecs = new Map([
      ['tc-1', makeExec('tc-1', 'bash', 'complete')],
    ])
    rerender(<ToolTimeline steps={steps} toolExecutions={completedExecs} />)

    // Auto-collapsed after streaming ends
    expect(screen.queryAllByTestId('timeline-step')).toHaveLength(0)
  })

  it('does NOT auto-collapse when user has manually toggled', () => {
    const steps = [makeStep('bash', 'tc-1')]
    const streamingExecs = new Map([
      ['tc-1', makeExec('tc-1', 'bash', 'inprogress')],
    ])

    const { rerender } = render(
      <ToolTimeline steps={steps} toolExecutions={streamingExecs} />,
    )

    // Default expanded; user collapses then re-expands (toggled = true)
    const btn = screen.getByRole('button', { name: /timeline/i })
    fireEvent.click(btn) // collapse
    fireEvent.click(btn) // expand
    expect(screen.getAllByTestId('timeline-step')).toHaveLength(1)

    const completedExecs = new Map([
      ['tc-1', makeExec('tc-1', 'bash', 'complete')],
    ])
    rerender(<ToolTimeline steps={steps} toolExecutions={completedExecs} />)

    // Stays expanded because user toggled
    expect(screen.getAllByTestId('timeline-step')).toHaveLength(1)
  })
})
