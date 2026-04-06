'use client'

import { memo, useEffect, type ReactNode } from 'react'
import { useScreenSize } from '../../hooks/use-screen-size.js'
import { useSidebar } from '../../hooks/use-sidebar.js'

export type ChatLayoutClassNames = {
  root?: string
  header?: string
  body?: string
  sidebar?: string
  main?: string
}

export type ChatLayoutProps = {
  sidebar?: ReactNode
  header?: ReactNode
  children?: ReactNode
  className?: string
  classNames?: ChatLayoutClassNames
  /** @deprecated width is now managed internally */
  sidebarWidth?: number | string
}

// Chevron icons (inline SVG, no deps)
function IconChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function IconChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function IconMenu() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export const ChatLayout = memo(function ChatLayout({
  sidebar,
  header,
  children,
  className,
  classNames,
}: ChatLayoutProps) {
  const screen = useScreenSize()
  const { collapsed, toggle, close } = useSidebar(false)

  // Keyboard shortcut: Cmd/Ctrl + E
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggle])

  const isOpen = !collapsed   // semantic alias

  // ── Toggle button ──────────────────────────────────────────────────────────
  const DesktopToggle = (
    <button
      type="button"
      onClick={toggle}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary transition-colors duration-fast hover:bg-hover hover:text-text-primary"
    >
      {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
    </button>
  )

  const MobileToggle = (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle sidebar"
      className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors duration-fast hover:bg-hover hover:text-text-primary"
    >
      {isOpen ? <IconX /> : <IconMenu />}
    </button>
  )

  // ── Sidebar inner with toggle button at top ─────────────────────────────────
  const SidebarInner = (
    <div className="flex h-full flex-col">
      {/* Toggle button row */}
      <div className={[
        'flex flex-shrink-0 items-center px-2 py-2',
        collapsed ? 'justify-center' : 'justify-end',
      ].join(' ')}>
        {DesktopToggle}
      </div>
      {/* Sidebar content */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-0">
          {sidebar}
        </div>
      )}
    </div>
  )

  // ── DESKTOP (> 1232px): normal flex flow ───────────────────────────────────
  if (screen === 'desktop') {
    return (
      <section className={[classNames?.root ?? 'flex flex-col h-full', className].filter(Boolean).join(' ')}>
        {header ? <header className={classNames?.header}>{header}</header> : null}
        <div className={classNames?.body ?? 'flex flex-1 overflow-hidden'}>
          {sidebar ? (
            <aside
              className={[
                'flex-shrink-0 border-r border-border bg-panel overflow-hidden transition-[width] duration-normal',
                collapsed ? 'w-[3.25rem]' : 'w-60',
                classNames?.sidebar,
              ].filter(Boolean).join(' ')}
            >
              {SidebarInner}
            </aside>
          ) : null}
          <main className={classNames?.main ?? 'flex-1 overflow-y-auto min-w-0'}>
            {children}
          </main>
        </div>
      </section>
    )
  }

  // ── MEDIUM (725–1232px): placeholder + fixed overlay ──────────────────────
  if (screen === 'medium') {
    return (
      <section className={[classNames?.root ?? 'flex flex-col h-full', className].filter(Boolean).join(' ')}>
        {header ? <header className={classNames?.header}>{header}</header> : null}
        <div className={classNames?.body ?? 'flex flex-1 overflow-hidden'}>
          {sidebar ? (
            <>
              {/* Placeholder: keeps layout stable */}
              <div className="flex-shrink-0 w-[3.25rem]" aria-hidden />
              {/* Actual sidebar: fixed, overlays content when expanded */}
              <aside
                className={[
                  'fixed inset-y-0 left-0 z-40 border-r border-border bg-panel overflow-hidden transition-[width] duration-normal',
                  isOpen ? 'w-60' : 'w-[3.25rem]',
                  classNames?.sidebar,
                ].filter(Boolean).join(' ')}
              >
                {SidebarInner}
              </aside>
              {/* Backdrop: blur only, no color tint */}
              {isOpen && (
                <div
                  className="fixed inset-0 z-30 backdrop-blur-[2px]"
                  onClick={close}
                  aria-hidden
                />
              )}
            </>
          ) : null}
          <main className={classNames?.main ?? 'flex-1 overflow-y-auto min-w-0'}>
            {children}
          </main>
        </div>
      </section>
    )
  }

  // ── MOBILE (≤ 724px): fixed overlay with backdrop ─────────────────────────
  return (
    <section className={[classNames?.root ?? 'flex flex-col h-full', className].filter(Boolean).join(' ')}>
      {header ? (
        <header className={classNames?.header}>
          {/* Mobile hamburger prepended to header */}
          <div className="flex items-center gap-2">
            {MobileToggle}
            {header}
          </div>
        </header>
      ) : (
        /* If no header, render floating hamburger */
        <div className="absolute left-3 top-3 z-50">
          {MobileToggle}
        </div>
      )}
      <div className={classNames?.body ?? 'flex flex-1 overflow-hidden'}>
        {sidebar ? (
          <>
            <aside
              className={[
                'fixed inset-y-0 left-0 z-50 w-60 border-r border-border bg-panel overflow-hidden',
                'transition-transform duration-normal',
                isOpen ? 'translate-x-0' : '-translate-x-full',
                classNames?.sidebar,
              ].filter(Boolean).join(' ')}
            >
              <div className="flex h-full flex-col">
                {/* Close button for mobile */}
                <div className="flex flex-shrink-0 items-center justify-end px-2 py-2">
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close sidebar"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary transition-colors duration-fast hover:bg-hover hover:text-text-primary"
                  >
                    <IconX />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {sidebar}
                </div>
              </div>
            </aside>
            {/* Backdrop: semi-transparent + blur */}
            {isOpen && (
              <div
                className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                onClick={close}
                aria-hidden
              />
            )}
          </>
        ) : null}
        <main className={classNames?.main ?? 'flex-1 overflow-y-auto min-w-0'}>
          {children}
        </main>
      </div>
    </section>
  )
})
