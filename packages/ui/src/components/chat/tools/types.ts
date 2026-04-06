import type { ReactNode } from 'react'
import type { ChatMessage, ToolCall } from '../client/types.js'

export type ToolRenderState = 'inprogress' | 'complete' | 'error'

export type ToolRenderResult = {
  content: ReactNode
  /** true = render as-is; false = wrap in default card container */
  custom?: boolean
}

export type ToolRenderContext = {
  toolCall: ToolCall
  result?: ChatMessage
  state: ToolRenderState
}

export interface ToolRenderer {
  render(ctx: ToolRenderContext): ToolRenderResult
}
