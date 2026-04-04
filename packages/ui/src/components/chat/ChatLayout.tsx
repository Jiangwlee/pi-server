import { memo, type ReactNode } from 'react'

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
  sidebarWidth?: number | string
}

export const ChatLayout = memo(function ChatLayout(
  {
    sidebar,
    header,
    children,
    className,
    classNames,
    sidebarWidth = 280,
  }: ChatLayoutProps,
) {
  return (
    <section
      className={[classNames?.root, className].filter(Boolean).join(' ')}
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      {header ? <header className={classNames?.header}>{header}</header> : null}
      <div className={classNames?.body} style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {sidebar ? (
          <aside
            className={classNames?.sidebar}
            style={{ width: sidebarWidth, flexShrink: 0, overflowY: 'auto' }}
          >
            {sidebar}
          </aside>
        ) : null}
        <main className={classNames?.main} style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
          {children}
        </main>
      </div>
    </section>
  )
})
