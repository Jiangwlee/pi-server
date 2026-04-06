import { describe, it, expect } from 'vitest'
import { resolveToolState } from '../../src/state/resolve-tool-state.js'
import type { ChatMessage } from '../../src/client/types.js'

function makeResult(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'tool-1',
    role: 'tool',
    content: [{ type: 'text', text: 'result' }],
    toolCallId: 'tc1',
    toolName: 'readFile',
    ...overrides,
  }
}

describe('resolveToolState', () => {
  it('returns complete when result exists and no error', () => {
    expect(resolveToolState(makeResult(), false)).toBe('complete')
    expect(resolveToolState(makeResult(), true)).toBe('complete')
    expect(resolveToolState(makeResult(), undefined)).toBe('complete')
  })

  it('returns error when result has isError', () => {
    expect(resolveToolState(makeResult({ isError: true }), false)).toBe('error')
    expect(resolveToolState(makeResult({ isError: true }), true)).toBe('error')
  })

  it('returns inprogress when no result (regardless of streaming)', () => {
    expect(resolveToolState(undefined, true)).toBe('inprogress')
    expect(resolveToolState(undefined, false)).toBe('inprogress')
    expect(resolveToolState(undefined, undefined)).toBe('inprogress')
  })
})
