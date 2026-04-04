// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ToolCallBlock } from '../../../src/components/chat/ToolCallBlock.js'

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

    const header = screen.getByRole('button', { name: 'readFile' })
    expect(header).toBeTruthy()
    expect(screen.queryByText(/tmp\/test\.txt/)).toBeNull()

    fireEvent.click(header)
    expect(screen.getByText(/tmp\/test\.txt/)).toBeTruthy()

    fireEvent.click(header)
    expect(screen.queryByText(/tmp\/test\.txt/)).toBeNull()
  })
})
