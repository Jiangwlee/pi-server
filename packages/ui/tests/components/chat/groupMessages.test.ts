import { describe, it, expect } from 'vitest'
import { groupMessagesIntoTurns } from '../../../src/state/group-messages.js'
import type { ChatMessage } from '../../../src/client/types.js'

function userMsg(id: string, text: string): ChatMessage {
  return { id, role: 'user', content: [{ type: 'text', text }] }
}

function assistantText(id: string, text: string): ChatMessage {
  return { id, role: 'assistant', content: [{ type: 'text', text }] }
}

function assistantToolCall(id: string, toolCallId: string, toolName: string): ChatMessage {
  return {
    id,
    role: 'assistant',
    content: [
      { type: 'thinking', thinking: 'reasoning...' },
      { type: 'toolCall', id: toolCallId, name: toolName, arguments: {} },
    ],
  }
}

function toolResult(id: string, toolCallId: string, toolName: string, text = 'result'): ChatMessage {
  return {
    id,
    role: 'tool',
    content: [{ type: 'text', text }],
    toolCallId,
    toolName,
  }
}

describe('groupMessagesIntoTurns', () => {
  it('returns empty for empty messages', () => {
    expect(groupMessagesIntoTurns([])).toEqual([])
  })

  it('wraps a single user message', () => {
    const msgs = [userMsg('u1', 'hello')]
    const turns = groupMessagesIntoTurns(msgs)
    expect(turns).toHaveLength(1)
    expect(turns[0].type).toBe('user')
  })

  it('wraps a single assistant message as agent turn with finalAnswer', () => {
    const msgs = [assistantText('a1', 'hi')]
    const turns = groupMessagesIntoTurns(msgs)
    expect(turns).toHaveLength(1)
    expect(turns[0].type).toBe('agent')
    const agent = turns[0] as Extract<typeof turns[0], { type: 'agent' }>
    expect(agent.steps).toHaveLength(0)
    expect(agent.finalAnswer?.id).toBe('a1')
  })

  it('groups user → assistant(text) into two turns', () => {
    const msgs = [userMsg('u1', 'hello'), assistantText('a1', 'hi')]
    const turns = groupMessagesIntoTurns(msgs)
    expect(turns).toHaveLength(2)
    expect(turns[0].type).toBe('user')
    expect(turns[1].type).toBe('agent')
  })

  it('groups a single tool call turn with finalAnswer', () => {
    const msgs = [
      userMsg('u1', 'list files'),
      assistantToolCall('a1', 'tc1', 'bash'),
      toolResult('t1', 'tc1', 'bash'),
      assistantText('a2', 'Here are the files'),
    ]
    const turns = groupMessagesIntoTurns(msgs)
    expect(turns).toHaveLength(2)

    const agent = turns[1] as Extract<typeof turns[0], { type: 'agent' }>
    expect(agent.steps).toHaveLength(1)
    expect(agent.steps[0].toolCall.name).toBe('bash')
    expect(agent.steps[0].result?.id).toBe('t1')
    expect(agent.finalAnswer?.id).toBe('a2')
  })

  it('groups multiple tool calls into steps', () => {
    const msgs = [
      userMsg('u1', 'do something complex'),
      assistantToolCall('a1', 'tc1', 'bash'),
      toolResult('t1', 'tc1', 'bash'),
      assistantToolCall('a2', 'tc2', 'read'),
      toolResult('t2', 'tc2', 'read'),
      assistantToolCall('a3', 'tc3', 'bash'),
      toolResult('t3', 'tc3', 'bash'),
      assistantText('a4', 'Done!'),
    ]
    const turns = groupMessagesIntoTurns(msgs)
    expect(turns).toHaveLength(2)

    const agent = turns[1] as Extract<typeof turns[0], { type: 'agent' }>
    expect(agent.steps).toHaveLength(3)
    expect(agent.steps[0].toolCall.id).toBe('tc1')
    expect(agent.steps[1].toolCall.id).toBe('tc2')
    expect(agent.steps[2].toolCall.id).toBe('tc3')
    expect(agent.finalAnswer?.id).toBe('a4')
  })

  it('handles multiple user turns', () => {
    const msgs = [
      userMsg('u1', 'first'),
      assistantText('a1', 'reply 1'),
      userMsg('u2', 'second'),
      assistantToolCall('a2', 'tc1', 'bash'),
      toolResult('t1', 'tc1', 'bash'),
      assistantText('a3', 'reply 2'),
    ]
    const turns = groupMessagesIntoTurns(msgs)
    expect(turns).toHaveLength(4)
    expect(turns[0].type).toBe('user')
    expect(turns[1].type).toBe('agent')
    expect(turns[2].type).toBe('user')
    expect(turns[3].type).toBe('agent')

    const agent1 = turns[1] as Extract<typeof turns[0], { type: 'agent' }>
    expect(agent1.steps).toHaveLength(0)
    expect(agent1.finalAnswer?.id).toBe('a1')

    const agent2 = turns[3] as Extract<typeof turns[0], { type: 'agent' }>
    expect(agent2.steps).toHaveLength(1)
    expect(agent2.finalAnswer?.id).toBe('a3')
  })

  it('handles agent turn without finalAnswer (aborted mid-tool)', () => {
    const msgs = [
      userMsg('u1', 'do something'),
      assistantToolCall('a1', 'tc1', 'bash'),
      toolResult('t1', 'tc1', 'bash'),
      assistantToolCall('a2', 'tc2', 'read'),
      // No tool result, no final answer — aborted
    ]
    const turns = groupMessagesIntoTurns(msgs)
    const agent = turns[1] as Extract<typeof turns[0], { type: 'agent' }>
    expect(agent.steps).toHaveLength(2)
    expect(agent.steps[1].result).toBeUndefined()
    expect(agent.finalAnswer).toBeUndefined()
  })

  it('handles step without result (tool still executing)', () => {
    const msgs = [
      userMsg('u1', 'run'),
      assistantToolCall('a1', 'tc1', 'bash'),
      // No tool result yet
    ]
    const turns = groupMessagesIntoTurns(msgs)
    const agent = turns[1] as Extract<typeof turns[0], { type: 'agent' }>
    expect(agent.steps).toHaveLength(1)
    expect(agent.steps[0].result).toBeUndefined()
    expect(agent.finalAnswer).toBeUndefined()
  })
})
