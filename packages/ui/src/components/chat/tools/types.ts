import type { ReactNode } from 'react'
import type { ChatMessage, ToolCall, ToolRenderState, RenderType } from '../../../client/types.js'

export type { ToolRenderState, RenderType }

export type ToolRenderResult = {
  content: ReactNode
  /** true = render as-is; false = wrap in default card container */
  custom?: boolean
}

export type ToolRenderContext = {
  toolCall: ToolCall
  result?: ChatMessage
  state: ToolRenderState
  renderType: RenderType
}

export interface ToolRenderer {
  render(ctx: ToolRenderContext): ToolRenderResult
  supportsRenderType?(renderType: RenderType): boolean
}
