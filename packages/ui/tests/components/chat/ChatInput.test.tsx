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

  it('calls onFiles when image is pasted', () => {
    const onFiles = vi.fn()
    render(<ChatInput value="" onFiles={onFiles} />)

    const textarea = screen.getByRole('textbox')
    const file = new File(['pixels'], 'photo.png', { type: 'image/png' })

    const clipboardData = {
      items: [{ type: 'image/png', getAsFile: () => file }],
    }

    fireEvent.paste(textarea, { clipboardData })

    expect(onFiles).toHaveBeenCalledWith([file])
  })

  it('does NOT intercept paste when no image in clipboard', () => {
    const onFiles = vi.fn()
    render(<ChatInput value="" onFiles={onFiles} />)

    const textarea = screen.getByRole('textbox')
    const clipboardData = {
      items: [{ type: 'text/plain', getAsFile: () => null }],
    }

    fireEvent.paste(textarea, { clipboardData })

    expect(onFiles).not.toHaveBeenCalled()
  })

  it('calls onFiles when files are dropped', () => {
    const onFiles = vi.fn()
    const { container } = render(<ChatInput value="" onFiles={onFiles} />)

    const root = container.firstElementChild!
    const file = new File(['pixels'], 'photo.png', { type: 'image/png' })

    fireEvent.dragEnter(root, { dataTransfer: { types: ['Files'], files: [] } })
    fireEvent.drop(root, { dataTransfer: { types: ['Files'], files: [file] } })

    expect(onFiles).toHaveBeenCalledWith([file])
  })

  it('shows drag overlay during drag and hides after drop', () => {
    const onFiles = vi.fn()
    const { container } = render(<ChatInput value="" onFiles={onFiles} />)

    const root = container.firstElementChild!

    // Before drag — no overlay
    expect(screen.queryByText('Drop files here')).toBeNull()

    // Start drag
    fireEvent.dragEnter(root, { dataTransfer: { types: ['Files'], files: [] } })
    expect(screen.getByText('Drop files here')).toBeTruthy()

    // Drop
    fireEvent.drop(root, { dataTransfer: { types: ['Files'], files: [] } })
    expect(screen.queryByText('Drop files here')).toBeNull()
  })

  it('calls onAbort on Escape when loading', () => {
    const onAbort = vi.fn()
    render(<ChatInput value="" onAbort={onAbort} loading />)

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' })

    expect(onAbort).toHaveBeenCalledTimes(1)
  })

  it('does NOT call onAbort on Escape when not loading', () => {
    const onAbort = vi.fn()
    render(<ChatInput value="" onAbort={onAbort} />)

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' })

    expect(onAbort).not.toHaveBeenCalled()
  })

  it('does NOT show drag overlay when onFiles is not provided', () => {
    const { container } = render(<ChatInput value="" />)

    const root = container.firstElementChild!
    fireEvent.dragEnter(root, { dataTransfer: { types: ['Files'], files: [] } })

    expect(screen.queryByText('Drop files here')).toBeNull()
  })
})
