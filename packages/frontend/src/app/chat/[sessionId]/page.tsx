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
          root: 'flex h-full flex-col gap-4 p-6',
          header: 'border-b border-zinc-200 pb-3',
          messageList: 'flex-1 space-y-3 overflow-y-auto rounded border border-zinc-200 p-4',
          messageItem: 'text-sm leading-6',
          messageUser: 'text-zinc-900',
          messageAssistant: 'text-zinc-700',
          messageTool: 'text-zinc-600',
          composer: 'rounded border border-zinc-200 p-2',
          textarea: 'w-full text-sm',
          modelSelect: 'rounded border border-zinc-300 px-2 py-2 text-sm',
          sendButton: 'rounded bg-zinc-900 px-4 py-1.5 text-sm text-white',
          footer: 'flex items-center gap-4 text-xs text-zinc-500',
        }}
      />
    </div>
  )
}
