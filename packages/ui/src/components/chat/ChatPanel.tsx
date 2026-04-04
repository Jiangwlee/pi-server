import { useCallback, useEffect, useState } from 'react'
import { useChat } from '../../hooks/use-chat.js'
import { useModels } from '../../hooks/use-models.js'
import { ChatInput } from './ChatInput.js'
import { ChatSendButton } from './ChatSendButton.js'
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
  textarea?: string
  modelSelect?: string
  sendButton?: string
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
  const [inputValue, setInputValue] = useState('')

  const isLoading = status === 'running'

  useEffect(() => {
    void loadModels()
  }, [loadModels])

  useEffect(() => {
    if (!selectedModelId && models.length > 0) {
      setSelectedModelId(models[0].id)
    }
  }, [models, selectedModelId])

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    void send(trimmed)
    setInputValue('')
  }, [inputValue, send])

  const handleStop = useCallback(() => {
    void abort()
  }, [abort])

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
        value={inputValue}
        onInput={setInputValue}
        onSend={handleSend}
        loading={isLoading}
        className={classNames?.composer}
        classNames={{ textarea: classNames?.textarea }}
        topAddons={
          models.length > 0 ? (
            <select
              className={classNames?.modelSelect}
              value={selectedModelId}
              onChange={(event) => setSelectedModelId(event.target.value)}
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name ?? model.id}
                </option>
              ))}
            </select>
          ) : null
        }
        bottomAddons={
          <ChatSendButton
            loading={isLoading}
            onSend={handleSend}
            onStop={handleStop}
            classNames={{ button: classNames?.sendButton }}
          />
        }
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
