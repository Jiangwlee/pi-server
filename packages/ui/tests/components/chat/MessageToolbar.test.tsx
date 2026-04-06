// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { MessageToolbar } from '../../../src/components/chat/MessageToolbar.js'

describe('MessageToolbar', () => {
  beforeEach(() => { cleanup() })

  it('renders copy button', () => {
    const { getByLabelText } = render(<MessageToolbar text="hello" />)
    expect(getByLabelText('Copy message')).toBeTruthy()
  })

  it('renders retry button when onRegenerate is provided', () => {
    const onRegenerate = vi.fn()
    const { getByLabelText } = render(<MessageToolbar text="hello" onRegenerate={onRegenerate} />)
    expect(getByLabelText('Regenerate')).toBeTruthy()
  })

  it('does not render retry button when onRegenerate is not provided', () => {
    const { queryByLabelText } = render(<MessageToolbar text="hello" />)
    expect(queryByLabelText('Regenerate')).toBeNull()
  })

  it('calls onRegenerate callback', () => {
    const onRegenerate = vi.fn()
    const { getByLabelText } = render(<MessageToolbar text="hello" onRegenerate={onRegenerate} />)
    getByLabelText('Regenerate').click()
    expect(onRegenerate).toHaveBeenCalledOnce()
  })
})
