// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'

const useStaticHighlightMock = vi.fn(() => null)
const useStreamHighlightMock = vi.fn(() => ({ lines: [] }))

vi.mock('../../../../src/components/chat/markdown/useStaticHighlight.js', () => ({
  useStaticHighlight: (...args: Parameters<typeof useStaticHighlightMock>) => useStaticHighlightMock(...args),
}))

vi.mock('../../../../src/components/chat/markdown/useStreamHighlight.js', () => ({
  useStreamHighlight: (...args: Parameters<typeof useStreamHighlightMock>) => useStreamHighlightMock(...args),
}))

import { CodeBlock, extractLanguageFromClassName } from '../../../../src/components/chat/markdown/CodeBlock.js'

describe('CodeBlock', () => {
  beforeEach(() => {
    useStaticHighlightMock.mockClear()
    useStreamHighlightMock.mockClear()
  })

  it('extracts language from className', () => {
    expect(extractLanguageFromClassName('language-ts')).toBe('ts')
    expect(extractLanguageFromClassName('foo language-bash bar')).toBe('bash')
    expect(extractLanguageFromClassName(undefined)).toBe('text')
  })

  it('renders fallback pre/code when highlight is not ready', () => {
    const { container } = render(
      <CodeBlock className="language-ts">{'const a = 1'}</CodeBlock>,
    )

    const pre = container.querySelector('pre')
    const code = container.querySelector('code.language-ts')
    expect(pre).toBeTruthy()
    expect(code).toBeTruthy()
    expect(code?.textContent).toBe('const a = 1')
  })

  it('passes detected language and code text to highlight hooks', () => {
    render(
      <CodeBlock className="language-js">{'console.log(1)'}</CodeBlock>,
    )

    expect(useStaticHighlightMock).toHaveBeenCalledWith('console.log(1)', 'js')
    expect(useStreamHighlightMock).toHaveBeenCalledWith('', 'js')
  })

  it('renders streaming fallback when stream tokens are unavailable', () => {
    const { container } = render(
      <CodeBlock className="language-js" streaming>{'let x = 1'}</CodeBlock>,
    )

    const code = container.querySelector('code.language-js')
    expect(code?.textContent).toBe('let x = 1')
  })
})
