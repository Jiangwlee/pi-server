'use client'

import { useParams } from 'next/navigation'
import { ChatPanel } from '@pi-server/ui'

export default function SessionPage() {
  const params = useParams<{ sessionId: string }>()

  return (
    <main className="h-full p-6">
      <ChatPanel
        sessionId={params.sessionId}
        classNames={{
          root: 'flex h-full flex-col gap-4',
          header: 'border-b border-zinc-200 pb-3',
          messageList: 'flex-1 space-y-3 overflow-y-auto rounded border border-zinc-200 p-4',
          messageItem: 'text-sm leading-6',
          messageUser: 'text-zinc-900',
          messageAssistant: 'text-zinc-700',
          messageTool: 'text-zinc-600',
          composer: 'flex items-center gap-2 border-t border-zinc-200 pt-3',
          modelSelect: 'rounded border border-zinc-300 px-2 py-2 text-sm',
          input: 'flex-1 rounded border border-zinc-300 px-3 py-2',
          sendButton: 'rounded border px-3 py-2 text-sm',
          abortButton: 'rounded border border-red-300 px-3 py-2 text-sm text-red-700',
          footer: 'flex items-center gap-4 text-xs text-zinc-500',
        }}
      />
    </main>
  )
}
