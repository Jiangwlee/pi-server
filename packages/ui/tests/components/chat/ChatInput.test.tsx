// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ChatInput } from '../../../src/components/chat/ChatInput.js'

afterEach(() => {
  cleanup()
})

describe('ChatInput', () => {
  it('renders textarea with placeholder', () => {
    render(<ChatInput value="" placeholder="Type a message" />)

    expect(screen.getByPlaceholderText('Type a message')).toBeTruthy()
  })

  it('calls onInput when typing', () => {
    const onInput = vi.fn()
    render(<ChatInput value="" onInput={onInput} />)

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'hello' } })

    expect(onInput).toHaveBeenCalledWith('hello')
  })

  it('calls onSend on Enter key (not Shift+Enter)', () => {
    const onSend = vi.fn()
    render(<ChatInput value="hello" onSend={onSend} />)

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })

    expect(onSend).toHaveBeenCalledTimes(1)
  })

  it('does NOT call onSend on Shift+Enter', () => {
    const onSend = vi.fn()
    render(<ChatInput value="hello" onSend={onSend} />)

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', shiftKey: true })

    expect(onSend).not.toHaveBeenCalled()
  })

  it('does NOT call onSend when loading', () => {
    const onSend = vi.fn()
    render(<ChatInput value="hello" onSend={onSend} loading />)

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })

    expect(onSend).not.toHaveBeenCalled()
  })

  it('does NOT call onSend during IME composition', () => {
    const onSend = vi.fn()
    render(<ChatInput value="hello" onSend={onSend} />)

    const textarea = screen.getByRole('textbox')
    fireEvent.compositionStart(textarea)
    fireEvent.keyDown(textarea, { key: 'Enter' })
    fireEvent.compositionEnd(textarea)

    expect(onSend).not.toHaveBeenCalled()
  })

  it('renders topAddons and bottomAddons', () => {
    render(
      <ChatInput
        value=""
        topAddons={<div>top content</div>}
        bottomAddons={<div>bottom content</div>}
      />,
    )

    expect(screen.getByText('top content')).toBeTruthy()
    expect(screen.getByText('bottom content')).toBeTruthy()
  })

  it('applies className and classNames', () => {
    const { container } = render(
      <ChatInput
        value=""
        className="root-extra"
        classNames={{
          root: 'root-base',
          textarea: 'textarea-class',
          topAddons: 'top-class',
          bottomAddons: 'bottom-class',
        }}
        topAddons={<div>top</div>}
        bottomAddons={<div>bottom</div>}
      />,
    )

    const root = container.firstElementChild
    expect(root?.className).toContain('root-base')
    expect(root?.className).toContain('root-extra')
    const textarea = screen.getByRole('textbox')
    expect(textarea.className).toContain('textarea-class')
    expect(container.querySelector('.top-class')).toBeTruthy()
    expect(container.querySelector('.bottom-class')).toBeTruthy()
  })

  it('auto-resizes textarea height on content change', () => {
    const { rerender } = render(<ChatInput value="hello" minRows={1} maxRows={6} />)

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    Object.defineProperty(textarea, 'scrollHeight', { value: 80, configurable: true })

    rerender(<ChatInput value={'hello\nworld'} minRows={1} maxRows={6} />)

    expect(textarea.style.height).toBe('80px')
  })
})
