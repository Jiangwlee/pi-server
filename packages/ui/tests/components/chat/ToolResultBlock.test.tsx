// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ToolResultBlock } from '../../../src/components/chat/ToolResultBlock.js'

describe('ToolResultBlock', () => {
  it('renders tool name and text/image content', () => {
    render(
      <ToolResultBlock
        message={{
          id: 'tool-1',
          role: 'tool',
          toolName: 'readFile',
          content: [
            { type: 'text', text: 'file content' },
            { type: 'image', data: 'aGVsbG8=', mimeType: 'image/png' },
          ],
        }}
      />,
    )

    expect(screen.getByText('readFile')).toBeTruthy()
    expect(screen.getByText('file content')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'message image' })).toBeTruthy()
  })
})
