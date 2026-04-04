// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TextBlock } from '../../../src/components/chat/TextBlock.js'

describe('TextBlock', () => {
  it('renders text content', () => {
    render(<TextBlock content={{ type: 'text', text: 'hello world' }} />)
    expect(screen.getByText('hello world')).toBeTruthy()
  })

  it('renders cursor when streaming', () => {
    const { container } = render(<TextBlock content={{ type: 'text', text: 'partial' }} streaming />)
    expect(container.querySelector('.streaming-cursor')).toBeTruthy()
    expect(container.querySelector('.streaming-cursor')!.textContent).toBe('▍')
    expect(container.textContent).toContain('partial')
  })
})
