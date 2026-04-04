'use client'

import { useParams } from 'next/navigation'
import { ChatPanel } from '@pi-server/ui'

export default function SessionPage() {
  const params = useParams<{ sessionId: string }>()

  return (
    <div className="flex h-full flex-col">
      <ChatPanel
        sessionId={params.sessionId}
        classNames={{
          root: 'flex h-full flex-col',
          header: 'flex items-center border-b border-border px-6 py-3',
          messageList: 'flex-1 overflow-y-auto px-6 py-4',
          messageItem: 'text-sm leading-relaxed',
          messageUser: 'text-text-primary',
          messageAssistant: 'pi-prose text-text-primary',
          messageTool: 'text-text-secondary',
          composer: 'mx-6 mb-4 rounded-lg border border-border bg-panel shadow-sm',
          textarea: 'w-full text-sm text-text-primary placeholder:text-text-muted',
          modelSelect: 'rounded-md border border-border bg-panel px-2.5 py-1.5 text-xs text-text-secondary outline-none transition-shadow duration-fast focus:shadow-focus-ring',
          sendButton: 'rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground transition-opacity duration-fast hover:opacity-85 disabled:opacity-40',
          footer: 'flex items-center gap-4 px-6 pb-3 text-xs text-text-muted',
        }}
      />
    </div>
  )
}
