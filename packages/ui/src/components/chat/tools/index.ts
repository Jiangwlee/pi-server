export type { ToolRenderState, RenderType, ToolRenderResult, ToolRenderContext, ToolRenderMetadata, ToolRenderer } from './types.js'
export { registerToolRenderer, getToolRenderer, getRegisteredToolNames } from './registry.js'
export { ToolHeader, StateIcon } from './renderers/ToolHeader.js'

// Side-effect: register built-in renderers
import './register-builtins.js'

import type { ChatMessage, ToolCall, ToolRenderState, RenderType } from '../../../client/types.js'
import type { ToolRenderResult, ToolRenderMetadata } from './types.js'
import { resolveToolState } from '../../../state/resolve-tool-state.js'
import { getToolRenderer } from './registry.js'
import { defaultRenderer } from './renderers/DefaultRenderer.js'

export { defaultRenderer }

export function getToolMetadata(
  toolCall: ToolCall,
  result: ChatMessage | undefined,
  state: ToolRenderState,
  renderType: RenderType = 'full',
): ToolRenderMetadata {
  const ctx = { toolCall, result, state, renderType }

  const renderer = getToolRenderer(toolCall.name)
  if (renderer?.getMetadata) return renderer.getMetadata(ctx)

  return defaultRenderer.getMetadata!(ctx)
}

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
