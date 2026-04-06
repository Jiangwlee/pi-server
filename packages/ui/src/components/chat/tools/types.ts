import type { ComponentType, ReactNode } from 'react'
import type { ChatMessage, ToolCall, ToolRenderState, RenderType } from '../../../client/types.js'
import type { IconProps } from '../../icons/types.js'

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

export type ToolRenderMetadata = {
  /** Icon component for TimelineRail. null = no icon */
  icon: ComponentType<IconProps> | null
  /** Header text for TimelineStepContent */
  status: string | ReactNode
  /** Background for TimelineSurface + TimelineStepContent error indicator. Default 'tint' */
  surfaceBackground?: 'tint' | 'transparent' | 'error'
}

export interface ToolRenderer {
  getMetadata?(ctx: ToolRenderContext): ToolRenderMetadata
  render(ctx: ToolRenderContext): ToolRenderResult
  supportsRenderType?(renderType: RenderType): boolean
}
