export type ParsedSSEFrame = {
  event: string
  data: unknown
  id?: string
}

export function parseSSEStream(chunk: string): ParsedSSEFrame[] {
  const frames: ParsedSSEFrame[] = []
  const blocks = chunk.split('\n\n').filter(Boolean)

  for (const block of blocks) {
    let event = 'message'
    let dataText = ''
    let id: string | undefined

    for (const line of block.split('\n')) {
      if (!line || line.startsWith(':')) continue
      if (line.startsWith('event:')) {
        event = line.slice('event:'.length).trim()
      } else if (line.startsWith('data:')) {
        dataText += line.slice('data:'.length).trim()
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

    frames.push({ event, data, id })
  }

  return frames
}
