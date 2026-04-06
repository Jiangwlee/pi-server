import { memo, type ReactNode } from 'react'

const defaults = {
  root: 'flex flex-col h-full',
  body: 'flex flex-1 overflow-hidden',
  sidebar: 'flex-shrink-0 overflow-y-auto',
  main: 'flex-1 overflow-y-auto min-w-0',
}

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
      className={[classNames?.root ?? defaults.root, className].filter(Boolean).join(' ')}
    >
      {header ? <header className={classNames?.header}>{header}</header> : null}
      <div className={classNames?.body ?? defaults.body}>
        {sidebar ? (
          <aside
            className={classNames?.sidebar ?? defaults.sidebar}
            style={{ width: sidebarWidth }}
          >
            {sidebar}
          </aside>
        ) : null}
        <main className={classNames?.main ?? defaults.main}>
          {children}
        </main>
      </div>
    </section>
  )
})
