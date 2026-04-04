export type ParsedSSEFrame = {
  event: string
  data: unknown
  id?: string
}

export type SSEConnectOptions = {
  url: string
  onEvent: (frame: ParsedSSEFrame) => void
  onError?: (error: unknown, attempt: number) => void
  onOpen?: () => void
  headers?: Record<string, string>
  credentials?: RequestCredentials
  retryDelayMs?: number
  maxRetries?: number
  signal?: AbortSignal
  fetchImpl?: typeof fetch
}

export type SSEConnection = {
  close: () => void
  done: Promise<void>
}

function parseSSEBlock(block: string): ParsedSSEFrame | null {
  let event = 'message'
  let dataText = ''
  let id: string | undefined

  for (const line of block.split('\n')) {
    if (!line || line.startsWith(':')) continue
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim()
    } else if (line.startsWith('data:')) {
      const next = line.slice('data:'.length).trim()
      dataText += dataText ? '\n' + next : next
    } else if (line.startsWith('id:')) {
      id = line.slice('id:'.length).trim()
    }
  }

  let data: unknown = dataText
  if (dataText) {
    try {
      data = JSON.parse(dataText)
    } catch {
      data = dataText
    }
  }

  return { event, data, id }
}

export function parseSSEStream(chunk: string): ParsedSSEFrame[] {
  const frames: ParsedSSEFrame[] = []
  const blocks = chunk.split('\n\n').filter(Boolean)

  for (const block of blocks) {
    const parsed = parseSSEBlock(block)
    if (parsed) {
      frames.push(parsed)
    }
  }

  return frames
}

export function consumeSSEBuffer(buffer: string): { frames: ParsedSSEFrame[]; rest: string } {
  const frames: ParsedSSEFrame[] = []
  const blocks = buffer.split('\n\n')
  const rest = blocks.pop() ?? ''
  for (const block of blocks) {
    if (!block.trim()) continue
    const parsed = parseSSEBlock(block)
    if (parsed) {
      frames.push(parsed)
    }
  }
  return { frames, rest }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function connectSSE(options: SSEConnectOptions): SSEConnection {
  const {
    url,
    onEvent,
    onError,
    onOpen,
    headers = {},
    credentials = 'include',
    retryDelayMs = 1000,
    maxRetries = 20,
    signal,
    fetchImpl = fetch,
  } = options

  const controller = new AbortController()
  let closed = false
  let attempt = 0
  let lastEventId: string | undefined

  const parentAbort = () => {
    controller.abort()
    closed = true
  }
  signal?.addEventListener('abort', parentAbort)

  const done = (async () => {
    while (!closed) {
      try {
        const reqHeaders: Record<string, string> = { ...headers }
        if (lastEventId) reqHeaders['Last-Event-ID'] = lastEventId

        const res = await fetchImpl(url, {
          method: 'GET',
          credentials,
          headers: reqHeaders,
          signal: controller.signal,
        })

        if (!res.ok || !res.body) {
          throw new Error('Failed to open SSE stream')
        }

        onOpen?.()
        attempt = 0

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let pending = ''

        while (!closed) {
          const { done: streamDone, value } = await reader.read()
          if (streamDone) break
          pending += decoder.decode(value, { stream: true })
          const parsed = consumeSSEBuffer(pending)
          pending = parsed.rest
          for (const frame of parsed.frames) {
            if (frame.id) lastEventId = frame.id
            onEvent(frame)
          }
        }

        pending += decoder.decode()
        const tail = consumeSSEBuffer(pending)
        for (const frame of tail.frames) {
          if (frame.id) lastEventId = frame.id
          onEvent(frame)
        }

        if (closed) return
      } catch (error) {
        if (closed || controller.signal.aborted) return
        attempt += 1
        onError?.(error, attempt)
        if (attempt > maxRetries) {
          throw error
        }
        await sleep(retryDelayMs)
      }
    }
  })().finally(() => {
    signal?.removeEventListener('abort', parentAbort)
  })

  return {
    close: () => {
      closed = true
      controller.abort()
      signal?.removeEventListener('abort', parentAbort)
    },
    done,
  }
}
