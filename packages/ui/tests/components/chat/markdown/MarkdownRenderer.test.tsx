// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MarkdownRenderer, splitMarkdownBlocks } from '../../../../src/components/chat/markdown/MarkdownRenderer.js'

vi.mock('../../../../src/components/chat/markdown/useStaticHighlight.js', () => ({
  useStaticHighlight: () => null,
}))

vi.mock('../../../../src/components/chat/markdown/useStreamHighlight.js', () => ({
  useStreamHighlight: () => ({ lines: [] }),
}))

describe('MarkdownRenderer', () => {
  it('renders basic markdown syntax', () => {
    render(
      <MarkdownRenderer>
        {'# Title\n\n**bold** [link](https://example.com)\n\n- one\n- two'}
      </MarkdownRenderer>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Title' })).toBeTruthy()
    expect(screen.getByText('bold')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'link' })).toBeTruthy()
    expect(screen.getByText('one')).toBeTruthy()
    expect(screen.getByText('two')).toBeTruthy()
  })

  it('renders fenced code block with language class', () => {
    const { container } = render(
      <MarkdownRenderer>
        {'```ts\nconst value = 1\n```'}
      </MarkdownRenderer>,
    )

    const code = container.querySelector('code.language-ts')
    expect(code).toBeTruthy()
    expect(code?.textContent).toContain('const value = 1')
  })

  it('renders streaming content', () => {
    render(<MarkdownRenderer streaming>{'# Stream\n\npartial content'}</MarkdownRenderer>)
    expect(screen.getByRole('heading', { level: 1, name: 'Stream' })).toBeTruthy()
    expect(screen.getByText('partial content')).toBeTruthy()
  })

  it('splits streaming markdown into blocks', () => {
    const blocks = splitMarkdownBlocks('# H1\n\nParagraph\n\n- a\n- b\n')
    expect(blocks.length).toBeGreaterThan(1)
    expect(blocks.map((block) => block.raw).join('')).toContain('Paragraph')
  })
})
