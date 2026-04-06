// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { afterEach } from 'vitest'
import { ToolCallBlock } from '../../../src/components/chat/ToolCallBlock.js'

afterEach(() => {
  cleanup()
})

describe('ToolCallBlock', () => {
  it('renders default renderer content for unregistered tool', () => {
    const { container } = render(
      <ToolCallBlock
        toolCall={{
          type: 'toolCall',
          id: 'tc1',
          name: 'readFile',
          arguments: { path: '/tmp/test.txt' },
        }}
      />,
    )

    // DefaultRenderer outputs a PreBlock with the formatted args
    const pre = container.querySelector('pre')
    expect(pre).toBeTruthy()
    expect(pre!.textContent).toContain('/tmp/test.txt')
  })

  it('renders result output', () => {
    const { container } = render(
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

    const pres = container.querySelectorAll('pre')
    // Should have input + output blocks
    expect(pres.length).toBe(2)
    expect(pres[1].textContent).toContain('file contents here')
  })

  it('renders bash tool with BashRenderer', () => {
    const { container } = render(
      <ToolCallBlock
        toolCall={{
          type: 'toolCall',
          id: 'tc1',
          name: 'bash',
          arguments: { command: 'ls -la' },
        }}
        result={{
          id: 'tool-1',
          role: 'tool',
          toolCallId: 'tc1',
          toolName: 'bash',
          content: [{ type: 'text', text: 'total 42\ndrwxr-xr-x 5 user' }],
        }}
      />,
    )

    // BashRenderer shows output only (command is in timeline header)
    expect(container.textContent).toContain('total 42')
  })

  it('returns null content when no args and no result', () => {
    const { container } = render(
      <ToolCallBlock
        toolCall={{
          type: 'toolCall',
          id: 'tc1',
          name: 'readFile',
          arguments: {},
        }}
      />,
    )

    // DefaultFullView returns null when no args and no result
    const pre = container.querySelector('pre')
    expect(pre).toBeNull()
  })
})
