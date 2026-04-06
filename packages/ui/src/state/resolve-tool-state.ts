import type { ChatMessage, ToolRenderState } from '../client/types.js'

export type { ToolRenderState }

export function resolveToolState(
  result: ChatMessage | undefined,
  streaming: boolean | undefined,
): ToolRenderState {
  if (result) return result.isError ? 'error' : 'complete'
  // No result yet: tool may still be executing (between message_end and turn_end)
  return 'inprogress'
}
