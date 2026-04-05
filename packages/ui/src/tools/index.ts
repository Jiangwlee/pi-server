export type { ToolRenderState, ToolRenderResult, ToolRenderContext, ToolRenderer } from './types.js'
export { registerToolRenderer, getToolRenderer, getRegisteredToolNames } from './registry.js'
export { ToolHeader } from './renderers/ToolHeader.js'

import type { ChatMessage, ToolCall } from '../client/types.js'
import type { ToolRenderResult, ToolRenderState } from './types.js'
import { getToolRenderer } from './registry.js'
import { defaultRenderer } from './renderers/DefaultRenderer.js'

export { defaultRenderer }

export function resolveToolState(
  result: ChatMessage | undefined,
  streaming: boolean | undefined,
): ToolRenderState {
  if (result) return result.isError ? 'error' : 'complete'
  // No result yet: tool may still be executing (between message_end and turn_end)
  return 'inprogress'
}

export function renderTool(
  toolCall: ToolCall,
  result: ChatMessage | undefined,
  streaming: boolean | undefined,
): ToolRenderResult {
  const state = resolveToolState(result, streaming)
  const ctx = { toolCall, result, state }

  const renderer = getToolRenderer(toolCall.name)
  if (renderer) return renderer.render(ctx)

  return defaultRenderer.render(ctx)
}
