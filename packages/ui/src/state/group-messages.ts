import type { ChatMessage, ToolCall } from '../client/types.js'

export type ToolStep = {
  toolCall: ToolCall
  result?: ChatMessage
}

export type UserTurn = {
  type: 'user'
  message: ChatMessage
}

export type AgentTurn = {
  type: 'agent'
  steps: ToolStep[]
  finalAnswer?: ChatMessage
}

export type GroupedTurn = UserTurn | AgentTurn

function extractToolCalls(message: ChatMessage): ToolCall[] {
  return message.content.filter((c): c is ToolCall => c.type === 'toolCall')
}

function hasTextContent(message: ChatMessage): boolean {
  return message.content.some(c => c.type === 'text' && c.text.trim().length > 0)
}

function finalizeAgentTurn(messages: ChatMessage[]): AgentTurn {
  const turn: AgentTurn = { type: 'agent', steps: [] }

  // Build toolCallId → tool result lookup
  const resultMap = new Map<string, ChatMessage>()
  for (const msg of messages) {
    if (msg.role === 'tool' && msg.toolCallId) {
      resultMap.set(msg.toolCallId, msg)
    }
  }

  // Extract steps: each toolCall in an assistant message becomes a step
  for (const msg of messages) {
    if (msg.role === 'assistant') {
      for (const tc of extractToolCalls(msg)) {
        turn.steps.push({ toolCall: tc, result: resultMap.get(tc.id) })
      }
    }
  }

  // Final answer: last assistant with no toolCall and has text
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role === 'assistant' && extractToolCalls(msg).length === 0 && hasTextContent(msg)) {
      turn.finalAnswer = msg
      break
    }
  }

  return turn
}

export function groupMessagesIntoTurns(messages: ChatMessage[]): GroupedTurn[] {
  const turns: GroupedTurn[] = []
  let agentMessages: ChatMessage[] = []

  function flushAgent() {
    if (agentMessages.length > 0) {
      turns.push(finalizeAgentTurn(agentMessages))
      agentMessages = []
    }
  }

  for (const msg of messages) {
    if (msg.role === 'user') {
      flushAgent()
      turns.push({ type: 'user', message: msg })
    } else {
      agentMessages.push(msg)
    }
  }

  flushAgent()
  return turns
}
