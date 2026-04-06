import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type ChatMessage, useChat } from '../../state/use-chat.js'
import { useModels } from '../../hooks/use-models.js'
import { ApiClient } from '../../client/api-client.js'
import { useFileUpload } from '../../hooks/use-file-upload.js'
import { useAutoScroll } from '../../hooks/use-auto-scroll.js'
import { ChatInput } from './ChatInput.js'
import { ChatSendButton } from './ChatSendButton.js'
import { ModelSelector, getModelOptionValue } from './ModelSelector.js'
import { FileUploadButton } from './FileUploadButton.js'
import { AttachmentPreview } from './AttachmentPreview.js'
import { ThinkingLevelSelector } from './ThinkingLevelSelector.js'
import { MessageList } from './MessageList.js'

const defaults = {
  messageListWrapper: 'flex-1 overflow-y-auto relative',
  scrollToBottom: 'sticky bottom-2 block mx-auto z-5 w-8 h-8 rounded-full border border-border bg-panel shadow-sm cursor-pointer text-sm',
}

type ChatPanelClassNames = {
  root?: string
  header?: string
  messageList?: string
  messageListWrapper?: string
  scrollToBottom?: string
  composer?: string
  footer?: string
  messageItem?: string
  messageUser?: string
  messageAssistant?: string
  messageTool?: string
  textarea?: string
  modelSelect?: string
  thinkingLevelSelect?: string
  sendButton?: string
  uploadButton?: string
  attachmentPreview?: string
}

export function ChatPanel(
  {
    sessionId,
    className,
    classNames,
    renderAvatar,
  }: {
    sessionId: string
    className?: string
    classNames?: ChatPanelClassNames
    renderAvatar?: (message: ChatMessage) => ReactNode
  },
) {
  const { messages, status, error, send, abort } = useChat({ sessionId })
  const { models, loadModels } = useModels()
  const fileUpload = useFileUpload({ sessionId })
  const [selectedModelId, setSelectedModelId] = useState<string>('')
  const [thinkingLevel, setThinkingLevel] = useState<'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'>('medium')
  const [inputValue, setInputValue] = useState('')
  const [feedbacks, setFeedbacks] = useState<Map<string, boolean | null>>(new Map())
  const apiClient = useMemo(() => new ApiClient(), [])

  const isLoading = status === 'running'
  const { scrollRef, isAtBottom, scrollToBottom } = useAutoScroll([messages, status])

  useEffect(() => {
    void loadModels()
  }, [loadModels])

  useEffect(() => {
    if (!selectedModelId && models.length > 0) {
      const preferred = models.find((m) => m.id === 'gpt-5.4-mini')
      setSelectedModelId(getModelOptionValue(preferred ?? models[0]))
    }
  }, [models, selectedModelId])

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    const attachments = fileUpload.files.length > 0
      ? fileUpload.files.map((f) => ({
        fileId: f.id,
        fileName: f.fileName,
        mimeType: f.mimeType,
        thumbnailUrl: f.thumbnailUrl,
      }))
      : undefined
    void send(trimmed, {
      ...(selectedModelId ? { model: selectedModelId } : {}),
      ...(fileUpload.fileIds.length > 0 ? { fileIds: fileUpload.fileIds } : {}),
      ...(attachments ? { attachments } : {}),
      thinkingLevel,
    })
    setInputValue('')
    fileUpload.clear()
  }, [inputValue, selectedModelId, send, fileUpload])

  const handleFiles = useCallback((files: File[]) => {
    for (const file of files) {
      void fileUpload.upload(file)
    }
  }, [fileUpload])

  const handleStop = useCallback(() => {
    void abort()
  }, [abort])

  const handleFeedback = useCallback((message: ChatMessage, isPositive: boolean) => {
    const current = feedbacks.get(message.id)
    // Toggle off if clicking the same button
    if (current === isPositive) {
      setFeedbacks(prev => new Map(prev).set(message.id, null))
      void apiClient.deleteFeedback(sessionId, message.id).catch(() => {
        setFeedbacks(prev => new Map(prev).set(message.id, isPositive))
      })
    } else {
      setFeedbacks(prev => new Map(prev).set(message.id, isPositive))
      void apiClient.submitFeedback(sessionId, message.id, isPositive).catch(() => {
        setFeedbacks(prev => new Map(prev).set(message.id, current ?? null))
      })
    }
  }, [feedbacks, sessionId, apiClient])

  return (
    <section className={[classNames?.root, className].filter(Boolean).join(' ')}>
      <header className={classNames?.header}>
        <h2>Session {sessionId}</h2>
      </header>
      <div
        ref={scrollRef as React.RefObject<HTMLDivElement>}
        className={classNames?.messageListWrapper ?? defaults.messageListWrapper}
      >
        <MessageList
          messages={messages}
          className={classNames?.messageList}
          classNames={{
            item: classNames?.messageItem,
            user: classNames?.messageUser,
            assistant: classNames?.messageAssistant,
            tool: classNames?.messageTool,
          }}
          renderAvatar={renderAvatar}
          onFeedback={handleFeedback}
          feedbacks={feedbacks}
        />
        {!isAtBottom ? (
          <button
            type="button"
            onClick={scrollToBottom}
            className={classNames?.scrollToBottom ?? defaults.scrollToBottom}
            aria-label="Scroll to bottom"
          >
            ↓
          </button>
        ) : null}
      </div>
      <ChatInput
        value={inputValue}
        onInput={setInputValue}
        onSend={handleSend}
        onAbort={handleStop}
        onFiles={handleFiles}
        loading={isLoading}
        className={classNames?.composer}
        classNames={{ textarea: classNames?.textarea }}
        topAddons={
          <AttachmentPreview
            files={fileUpload.files}
            onRemove={fileUpload.remove}
            className={classNames?.attachmentPreview}
          />
        }
        bottomAddons={
          <ChatSendButton
            loading={isLoading}
            onSend={handleSend}
            onStop={handleStop}
            classNames={{ button: classNames?.sendButton }}
            leftAddons={
              <>
                <FileUploadButton
                  onFiles={handleFiles}
                  disabled={isLoading || fileUpload.uploading}
                  className={classNames?.uploadButton}
                />
                <ModelSelector
                  models={models}
                  value={selectedModelId}
                  onChange={setSelectedModelId}
                  className={classNames?.modelSelect}
                />
                <ThinkingLevelSelector
                  value={thinkingLevel}
                  onChange={setThinkingLevel}
                  disabled={isLoading}
                  className={classNames?.thinkingLevelSelect}
                />
              </>
            }
          />
        }
      />
      <footer className={classNames?.footer}>
        <span>Status: {status}</span>
        {error ? <span>Error: {error}</span> : null}
        {fileUpload.error ? <span>Upload error: {fileUpload.error}</span> : null}
      </footer>
    </section>
  )
}
