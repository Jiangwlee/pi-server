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
          messageListWrapper: 'flex-1 overflow-y-auto relative',
          messageList: 'py-4 max-w-4xl mx-auto w-full',
          messageItem: 'text-sm leading-relaxed',
          messageUser: 'text-text-primary',
          messageAssistant: 'pi-prose text-text-primary',
          messageTool: 'text-text-secondary text-xs',
          composer: 'max-w-2xl mx-auto w-full px-4 mb-8 rounded-2xl bg-panel shadow-md',
          textarea: 'w-full resize-none bg-transparent outline-none text-sm leading-6 px-3 pt-3 pb-2 text-text-primary placeholder:text-text-muted',
          modelSelect: 'rounded-md border border-border bg-panel px-2.5 py-1.5 text-xs text-text-secondary outline-none transition-shadow duration-fast focus:shadow-focus-ring',
          footer: 'flex items-center gap-4 px-6 pb-3 text-xs text-text-muted',
        }}
      />
    </div>
  )
}
