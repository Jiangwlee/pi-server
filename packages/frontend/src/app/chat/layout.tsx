'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AuthGuard, ChatLayout, SessionList, useSessions } from '@pi-server/ui'

export default function ChatLayoutPage({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { sessions, loading, loadSessions, createSession, deleteSession } = useSessions()

  useEffect(() => {
    void loadSessions()
  }, [loadSessions, pathname])

  const selectedSessionId = pathname.startsWith('/chat/') ? pathname.split('/')[2] : undefined

  return (
    <AuthGuard
      loadingFallback={<div className="flex h-screen items-center justify-center text-sm text-text-muted">Checking authentication...</div>}
      unauthenticatedFallback={<UnauthenticatedRedirect />}
      errorFallback={<div className="flex h-screen items-center justify-center text-sm text-danger">Authentication failed. Please login again.</div>}
    >
      <ChatLayout
        classNames={{
          root: 'h-screen flex flex-col',
        }}
        sidebar={
          <div className="p-4">
            <SessionList
            sessions={sessions}
            loading={loading}
            selectedSessionId={selectedSessionId}
            classNames={{
              header: 'mb-4',
              newButton: 'w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-opacity duration-fast hover:opacity-85',
              empty: 'text-sm text-text-muted',
              list: 'mt-3 flex flex-col gap-1',
              item: 'rounded-md px-3 py-2.5 text-sm transition-colors duration-fast cursor-pointer hover:bg-hover',
              itemSelected: 'bg-accent-soft font-medium',
              itemLabel: 'text-sm text-text-primary',
              itemMeta: 'mt-0.5 text-xs text-text-muted',
              itemDeleteButton: 'mt-1.5 text-xs text-danger opacity-0 group-hover:opacity-100 transition-opacity duration-fast',
            }}
            onCreateSession={async () => {
              const created = await createSession()
              router.push('/chat/' + created.id)
            }}
            onSelectSession={(id) => {
              router.push('/chat/' + id)
            }}
            onDeleteSession={async (id) => {
              await deleteSession(id)
              if (selectedSessionId === id) {
                router.push('/chat')
              }
            }}
          />
          </div>
        }
      >
        {children}
      </ChatLayout>
    </AuthGuard>
  )
}

function UnauthenticatedRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/login')
  }, [router])
  return <div className="flex h-screen items-center justify-center text-sm text-text-muted">Redirecting to login...</div>
}
