export type { ToolRenderState, RenderType, ToolRenderResult, ToolRenderContext, ToolRenderer } from './types.js'
export { registerToolRenderer, getToolRenderer, getRegisteredToolNames } from './registry.js'
export { ToolHeader, StateIcon } from './renderers/ToolHeader.js'

import type { ChatMessage, ToolCall, RenderType } from '../../../client/types.js'
import type { ToolRenderResult } from './types.js'
import { resolveToolState } from '../../../state/resolve-tool-state.js'
import { getToolRenderer } from './registry.js'
import { defaultRenderer } from './renderers/DefaultRenderer.js'

export { defaultRenderer }

export function renderTool(
  toolCall: ToolCall,
  result: ChatMessage | undefined,
  streaming: boolean | undefined,
  renderType: RenderType = 'full',
): ToolRenderResult {
  const state = resolveToolState(result, streaming)
  const ctx = { toolCall, result, state, renderType }

  const renderer = getToolRenderer(toolCall.name)
  if (renderer) return renderer.render(ctx)

  return defaultRenderer.render(ctx)
}
