import type { ReactNode } from 'react'
import type { ChatMessage, ToolCall, ToolRenderState } from '../../../client/types.js'

export type { ToolRenderState }

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
