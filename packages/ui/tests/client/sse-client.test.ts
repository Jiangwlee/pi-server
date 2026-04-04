import { describe, it, expect } from 'vitest'
import { parseSSEStream } from '../../src/client/sse-client.js'

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

  it('defaults event to message when omitted', () => {
    const frames = parseSSEStream('id: 2\ndata: {"x":1}\n\n')
    expect(frames[0]?.event).toBe('message')
    expect(frames[0]?.id).toBe('2')
    expect(frames[0]?.data).toEqual({ x: 1 })
  })
})
