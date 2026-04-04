// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ThinkingBlock } from '../../../src/components/chat/ThinkingBlock.js'

describe('ThinkingBlock', () => {
  it('is collapsed by default', () => {
    render(<ThinkingBlock content={{ type: 'thinking', thinking: 'internal' }} />)
    expect(screen.getByRole('button', { name: 'Thinking...' })).toBeTruthy()
    expect(screen.queryByText('internal')).toBeNull()
  })

  it('toggles on header click', () => {
    const { getAllByRole, getByText, queryByText } = render(
      <ThinkingBlock content={{ type: 'thinking', thinking: 'internal' }} />,
    )
    const header = getAllByRole('button', { name: 'Thinking...' }).at(-1)
    if (!header) throw new Error('Missing Thinking header')

    fireEvent.click(header)
    expect(getByText('internal')).toBeTruthy()

    fireEvent.click(header)
    expect(queryByText('internal')).toBeNull()
  })

  it('shows redacted text when content is redacted', () => {
    render(<ThinkingBlock content={{ type: 'thinking', thinking: 'secret', redacted: true }} defaultExpanded />)
    expect(screen.getByText('[Redacted]')).toBeTruthy()
    expect(screen.queryByText('secret')).toBeNull()
  })

  it('is always expanded while streaming', () => {
    const { getAllByRole, getByText } = render(
      <ThinkingBlock content={{ type: 'thinking', thinking: 'streaming thought' }} streaming />,
    )
    const header = getAllByRole('button', { name: 'Thinking...' }).at(-1)
    if (!header) throw new Error('Missing Thinking header')

    expect(header.className).toContain('thinking-streaming')
    expect(getByText('streaming thought')).toBeTruthy()

    fireEvent.click(header)
    expect(getByText('streaming thought')).toBeTruthy()
  })
})
