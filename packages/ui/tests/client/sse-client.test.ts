import { describe, it, expect } from 'vitest'
import { consumeSSEBuffer, parseSSEStream } from '../../src/client/sse-client.js'

describe('parseSSEStream', () => {
  it('parses event/data/id frames', () => {
    const frames = parseSSEStream('event: status\nid: 1\ndata: {"status":"running"}\n\n')
    expect(frames).toEqual([
      {
        event: 'status',
        id: '1',
        data: { status: 'running' },
      },
    ])
  })

  it('parses CRLF-delimited frames', () => {
    const frames = parseSSEStream('event: status\r\nid: 1\r\ndata: {"status":"running"}\r\n\r\n')
    expect(frames).toEqual([
      {
        event: 'status',
        id: '1',
        data: { status: 'running' },
      },
    ])
  })

  it('defaults event to message when omitted', () => {
    const frames = parseSSEStream('id: 2\ndata: {"x":1}\n\n')
    expect(frames[0]?.event).toBe('message')
    expect(frames[0]?.id).toBe('2')
    expect(frames[0]?.data).toEqual({ x: 1 })
  })

  it('joins multiline data with newline', () => {
    const frames = parseSSEStream('event: pi\ndata: hello\ndata: world\n\n')
    expect(frames[0]?.data).toBe('hello\nworld')
  })

  it('keeps trailing partial chunk as rest', () => {
    const parsed = consumeSSEBuffer('event: status\ndata: {"status":"idle"}\n\nid: 2\nda')
    expect(parsed.frames).toHaveLength(1)
    expect(parsed.rest).toBe('id: 2\nda')
  })

  it('keeps trailing partial chunk as rest with CRLF separators', () => {
    const parsed = consumeSSEBuffer('event: status\r\ndata: {"status":"idle"}\r\n\r\nid: 2\r\nda')
    expect(parsed.frames).toHaveLength(1)
    expect(parsed.rest).toBe('id: 2\r\nda')
  })
})
