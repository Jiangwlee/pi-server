// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach } from 'vitest'
import { ToolCallBlock } from '../../../src/components/chat/ToolCallBlock.js'

afterEach(() => {
  cleanup()
})

describe('ToolCallBlock', () => {
  it('renders tool name and toggles arguments', () => {
    render(
      <ToolCallBlock
        toolCall={{
          type: 'toolCall',
          id: 'tc1',
          name: 'readFile',
          arguments: { path: '/tmp/test.txt' },
        }}
      />,
    )

    // Tool name should be visible in the header
    expect(screen.getByText('readFile')).toBeTruthy()
    // No result → inprogress state → expanded by default, showing input
    expect(screen.getByText(/tmp\/test\.txt/)).toBeTruthy()

    // Click to collapse
    const toggle = screen.getByRole('button')
    fireEvent.click(toggle)
    expect(screen.queryByText(/tmp\/test\.txt/)).toBeNull()

    // Click to expand again
    fireEvent.click(toggle)
    expect(screen.getByText(/tmp\/test\.txt/)).toBeTruthy()
  })

  it('shows complete state with result', () => {
    render(
      <ToolCallBlock
        toolCall={{
          type: 'toolCall',
          id: 'tc1',
          name: 'readFile',
          arguments: { path: '/tmp/test.txt' },
        }}
        result={{
          id: 'tool-1',
          role: 'tool',
          toolCallId: 'tc1',
          toolName: 'readFile',
          content: [{ type: 'text', text: 'file contents here' }],
        }}
      />,
    )

    expect(screen.getByText('readFile')).toBeTruthy()
    // Complete state: collapsed by default
    const toggle = screen.getByRole('button')
    fireEvent.click(toggle)
    expect(screen.getByText('Input')).toBeTruthy()
    expect(screen.getByText('Output')).toBeTruthy()
    expect(screen.getByText(/file contents here/)).toBeTruthy()
  })

  it('shows inprogress state when streaming', () => {
    render(
      <ToolCallBlock
        toolCall={{
          type: 'toolCall',
          id: 'tc1',
          name: 'bash',
          arguments: { command: 'ls' },
        }}
        streaming
      />,
    )

    expect(screen.getByText('bash')).toBeTruthy()
    // Inprogress state: expanded by default, shows Input
    expect(screen.getByText('Input')).toBeTruthy()
  })

  it('shows error state when result has isError', () => {
    render(
      <ToolCallBlock
        toolCall={{
          type: 'toolCall',
          id: 'tc1',
          name: 'readFile',
          arguments: { path: '/nonexistent' },
        }}
        result={{
          id: 'tool-1',
          role: 'tool',
          toolCallId: 'tc1',
          toolName: 'readFile',
          isError: true,
          content: [{ type: 'text', text: 'File not found' }],
        }}
      />,
    )

    expect(screen.getByText('readFile')).toBeTruthy()
    // Error state: expanded by default
    expect(screen.getByText(/File not found/)).toBeTruthy()
  })
})
