import type { ToolRenderContext, ToolRenderResult, ToolRenderMetadata, ToolRenderer } from '../types.js'
import SvgCircle from '../../../icons/SvgCircle.js'

function formatJson(value: unknown): string {
  try {
    if (typeof value === 'string') {
      const parsed = JSON.parse(value)
      return JSON.stringify(parsed, null, 2)
    }
    return JSON.stringify(value, null, 2)
  } catch {
    return typeof value === 'string' ? value : JSON.stringify(value)
  }
}

function extractResultText(ctx: ToolRenderContext): string | null {
  if (!ctx.result) return null
  const texts = ctx.result.content
    .filter((c) => c.type === 'text')
    .map((c) => (c as { text: string }).text)
  return texts.length > 0 ? texts.join('\n') : null
}

function PreBlock({ value }: { value: string }) {
  return (
    <pre
      className="m-0 font-mono text-xs leading-relaxed overflow-auto"
      style={{
        maxHeight: 300,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        color: 'var(--tl-text-03, rgba(0,0,0,0.6))',
      }}
    >
      {value}
    </pre>
  )
}

/** Full view: Input args + Output text, no tool name or fold button */
function DefaultFullView({ ctx }: { ctx: ToolRenderContext }) {
  const args = ctx.toolCall.arguments
  const hasArgs = args && Object.keys(args).length > 0
  const resultText = extractResultText(ctx)

  let formattedResult = resultText
  if (resultText) {
    try {
      formattedResult = JSON.stringify(JSON.parse(resultText), null, 2)
    } catch {
      // keep as-is
    }
  }

  if (!hasArgs && !formattedResult) return null

  return (
    <div className="flex flex-col gap-2">
      {hasArgs && <PreBlock value={formatJson(args)} />}
      {hasArgs && formattedResult && <hr className="border-t border-border m-0" />}
      {formattedResult && <PreBlock value={formattedResult} />}
    </div>
  )
}

/** Compact view: single-line summary */
function DefaultCompactView({ ctx }: { ctx: ToolRenderContext }) {
  const text = extractResultText(ctx)
  return (
    <div
      className="text-xs truncate"
      style={{
        opacity: 0.8,
        color: 'var(--tl-text-03, rgba(0,0,0,0.6))',
      }}
    >
      {text || ctx.toolCall.name}
    </div>
  )
}

export const defaultRenderer: ToolRenderer = {
  getMetadata(ctx: ToolRenderContext): ToolRenderMetadata {
    return {
      icon: SvgCircle,
      status: ctx.toolCall.name,
      surfaceBackground: ctx.state === 'error' ? 'error' : 'tint',
    }
  },
  render(ctx: ToolRenderContext): ToolRenderResult {
    if (ctx.renderType === 'compact') {
      return { content: <DefaultCompactView ctx={ctx} />, custom: true }
    }
    return { content: <DefaultFullView ctx={ctx} />, custom: true }
  },
  supportsRenderType(renderType) {
    return renderType === 'full' || renderType === 'compact'
  },
}
