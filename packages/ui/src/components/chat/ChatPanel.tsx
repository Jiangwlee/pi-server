import { useEffect, useState } from 'react'
import { useChat } from '../../hooks/use-chat.js'
import { useModels } from '../../hooks/use-models.js'
import { ChatInput } from './ChatInput.js'
import { MessageList } from './MessageList.js'

type ChatPanelClassNames = {
  root?: string
  header?: string
  messageList?: string
  composer?: string
  footer?: string
  messageItem?: string
  messageUser?: string
  messageAssistant?: string
  messageTool?: string
  input?: string
  modelSelect?: string
  sendButton?: string
  abortButton?: string
}

export function ChatPanel(
  {
    sessionId,
    className,
    classNames,
  }: {
    sessionId: string
    className?: string
    classNames?: ChatPanelClassNames
  },
) {
  const { messages, status, error, send, abort } = useChat({ sessionId })
  const { models, loadModels } = useModels()
  const [selectedModelId, setSelectedModelId] = useState<string>('')

  useEffect(() => {
    void loadModels()
  }, [loadModels])

  useEffect(() => {
    if (!selectedModelId && models.length > 0) {
      setSelectedModelId(models[0].id)
    }
  }, [models, selectedModelId])

  return (
    <section className={[classNames?.root, className].filter(Boolean).join(' ')}>
      <header className={classNames?.header}>
        <h2>Session {sessionId}</h2>
      </header>
      <MessageList
        messages={messages}
        className={classNames?.messageList}
        classNames={{
          item: classNames?.messageItem,
          user: classNames?.messageUser,
          assistant: classNames?.messageAssistant,
          tool: classNames?.messageTool,
        }}
      />
      <ChatInput
        status={status}
        models={models}
        selectedModelId={selectedModelId}
        onModelChange={setSelectedModelId}
        onSend={send}
        onAbort={abort}
        className={classNames?.composer}
        classNames={{
          input: classNames?.input,
          modelSelect: classNames?.modelSelect,
          sendButton: classNames?.sendButton,
          abortButton: classNames?.abortButton,
        }}
      />
      <footer className={classNames?.footer}>
        <span>Status: {status}</span>
        <span>Models: {models.length}</span>
        {selectedModelId ? <span>Selected: {selectedModelId}</span> : null}
        {error ? <span>Error: {error}</span> : null}
      </footer>
    </section>
  )
}
