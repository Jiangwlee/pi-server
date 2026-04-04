// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ChatSendButton } from '../../../src/components/chat/ChatSendButton.js'

afterEach(() => {
  cleanup()
})

describe('ChatSendButton', () => {
  it('renders send button when not loading', () => {
    render(<ChatSendButton />)

    expect(screen.getByRole('button', { name: 'Send' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Stop' })).toBeNull()
  })

  it('renders stop button when loading', () => {
    render(<ChatSendButton loading />)

    expect(screen.getByRole('button', { name: 'Stop' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Send' })).toBeNull()
  })

  it('calls onSend when send clicked', () => {
    const onSend = vi.fn()
    render(<ChatSendButton onSend={onSend} />)

    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    expect(onSend).toHaveBeenCalledTimes(1)
  })

  it('calls onStop when stop clicked', () => {
    const onStop = vi.fn()
    render(<ChatSendButton loading onStop={onStop} />)

    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))

    expect(onStop).toHaveBeenCalledTimes(1)
  })

  it('renders keyboard hint', () => {
    render(<ChatSendButton />)

    expect(screen.getByText('↵ Send')).toBeTruthy()
  })

  it('renders leftAddons and rightAddons', () => {
    render(<ChatSendButton leftAddons={<div>left</div>} rightAddons={<div>right</div>} />)

    expect(screen.getByText('left')).toBeTruthy()
    expect(screen.getByText('right')).toBeTruthy()
  })

  it('applies classNames', () => {
    const { container } = render(
      <ChatSendButton
        className="root-extra"
        classNames={{ root: 'root-base', button: 'button-class', hint: 'hint-class' }}
      />,
    )

    const root = container.firstElementChild
    expect(root?.className).toContain('root-base')
    expect(root?.className).toContain('root-extra')
    expect(screen.getByRole('button', { name: 'Send' }).className).toContain('button-class')
    expect(screen.getByText('↵ Send').className).toContain('hint-class')
  })
})
