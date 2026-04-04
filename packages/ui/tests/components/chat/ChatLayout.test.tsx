// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { cleanup } from '@testing-library/react'
import { ChatLayout } from '../../../src/components/chat/ChatLayout.js'

afterEach(() => {
  cleanup()
})

describe('ChatLayout', () => {
  it('renders sidebar and main content', () => {
    render(<ChatLayout sidebar={<div>sidebar content</div>}>main content</ChatLayout>)

    expect(screen.getByText('sidebar content')).toBeTruthy()
    expect(screen.getByText('main content')).toBeTruthy()
  })

  it('hides sidebar when not provided', () => {
    const { container } = render(<ChatLayout>main content</ChatLayout>)

    expect(screen.getByText('main content')).toBeTruthy()
    expect(container.querySelector('aside')).toBeNull()
  })

  it('renders header when provided', () => {
    render(<ChatLayout header={<div>header content</div>}>main content</ChatLayout>)

    expect(screen.getByText('header content')).toBeTruthy()
  })

  it('applies className and classNames', () => {
    const { container } = render(
      <ChatLayout
        sidebar={<div>sidebar</div>}
        header={<div>header</div>}
        className="root-extra"
        classNames={{
          root: 'root-base',
          header: 'header-class',
          body: 'body-class',
          sidebar: 'sidebar-class',
          main: 'main-class',
        }}
      >
        main
      </ChatLayout>,
    )

    const root = container.firstElementChild
    expect(root?.className).toContain('root-base')
    expect(root?.className).toContain('root-extra')
    expect(container.querySelector('.header-class')).toBeTruthy()
    expect(container.querySelector('.body-class')).toBeTruthy()
    expect(container.querySelector('.sidebar-class')).toBeTruthy()
    expect(container.querySelector('.main-class')).toBeTruthy()
  })

  it('applies custom sidebarWidth', () => {
    const { container } = render(
      <ChatLayout sidebar={<div>sidebar</div>} sidebarWidth={320} classNames={{ sidebar: 'sidebar-class' }}>
        main
      </ChatLayout>,
    )

    const sidebar = container.querySelector('.sidebar-class') as HTMLElement | null
    expect(sidebar).toBeTruthy()
    expect(sidebar?.style.width).toBe('320px')
  })

  it('default sidebarWidth is 280', () => {
    const { container } = render(
      <ChatLayout sidebar={<div>sidebar</div>} classNames={{ sidebar: 'sidebar-class' }}>
        main
      </ChatLayout>,
    )

    const sidebar = container.querySelector('.sidebar-class') as HTMLElement | null
    expect(sidebar).toBeTruthy()
    expect(sidebar?.style.width).toBe('280px')
  })
})
