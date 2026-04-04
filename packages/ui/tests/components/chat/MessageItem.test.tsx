// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MessageItem } from '../../../src/components/chat/MessageItem.js'

describe('MessageItem', () => {
  it('renders user message text', () => {
    render(
      <MessageItem
        message={{
          id: 'u1',
          role: 'user',
          content: [{ type: 'text', text: 'hello user' }],
        }}
      />, 
    )

    expect(screen.getByText('hello user')).toBeTruthy()
  })

  it('dispatches assistant content blocks by type', () => {
    render(
      <MessageItem
        message={{
          id: 'a1',
          role: 'assistant',
          content: [
            { type: 'text', text: 'answer text' },
            { type: 'thinking', thinking: 'private thought' },
            { type: 'toolCall', id: 'tc1', name: 'runTool', arguments: { x: 1 } },
            { type: 'image', data: 'aGVsbG8=', mimeType: 'image/png' },
          ],
        }}
      />, 
    )

    expect(screen.getByText('answer text')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Thinking...' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'runTool' })).toBeTruthy()
    expect(screen.getByRole('img', { name: 'message image' })).toBeTruthy()
  })

  it('renders usage when not streaming', () => {
    render(
      <MessageItem
        message={{
          id: 'a2',
          role: 'assistant',
          content: [{ type: 'text', text: 'done' }],
          streaming: false,
          usage: {
            input: 1,
            output: 2,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 3,
            cost: {
              input: 0,
              output: 0,
              cacheRead: 0,
              cacheWrite: 0,
              total: 0,
            },
          },
        }}
      />, 
    )

    expect(screen.getByText('Usage: in 1, out 2, total 3')).toBeTruthy()
  })

  it('renders error and aborted stop reasons', () => {
    const { rerender } = render(
      <MessageItem
        message={{
          id: 'a3',
          role: 'assistant',
          content: [{ type: 'text', text: 'x' }],
          stopReason: 'error',
        }}
      />,
    )

    expect(screen.getByText('Error')).toBeTruthy()

    rerender(
      <MessageItem
        message={{
          id: 'a4',
          role: 'assistant',
          content: [{ type: 'text', text: 'x' }],
          stopReason: 'aborted',
        }}
      />,
    )

    expect(screen.getByText('Aborted')).toBeTruthy()
  })

  it('renders tool message via ToolResultBlock', () => {
    render(
      <MessageItem
        message={{
          id: 't1',
          role: 'tool',
          toolName: 'readFile',
          content: [{ type: 'text', text: 'tool output' }],
        }}
      />, 
    )

    expect(screen.getByText('readFile')).toBeTruthy()
    expect(screen.getByText('tool output')).toBeTruthy()
  })
})
