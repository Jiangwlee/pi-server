import { useState } from 'react'
import type { ToolRenderContext, ToolRenderResult, ToolRenderer } from '../types.js'
import { ToolHeader } from './ToolHeader.js'

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

function JsonBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, opacity: 0.6 }}>
        {label}
      </div>
      <pre
        style={{
          margin: 0,
          padding: '8px 12px',
          fontSize: 12,
          lineHeight: 1.5,
          borderRadius: 6,
          background: 'var(--color-code-bg, rgba(128, 128, 128, 0.08))',
          border: '1px solid var(--color-border, rgba(128, 128, 128, 0.15))',
          overflow: 'auto',
          maxHeight: 300,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </pre>
    </div>
  )
}

function DefaultRendererView({ ctx }: { ctx: ToolRenderContext }) {
  const [expanded, setExpanded] = useState(ctx.state !== 'complete')
  const args = ctx.toolCall.arguments
  const hasArgs = args && Object.keys(args).length > 0
  const resultText = extractResultText(ctx)

  // Format result: try to pretty-print JSON
  let formattedResult = resultText
  if (resultText) {
    try {
      formattedResult = JSON.stringify(JSON.parse(resultText), null, 2)
    } catch {
      // keep as-is
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <span style={{ fontSize: 12, opacity: 0.5, width: 16, textAlign: 'center' }}>
          {expanded ? '\u25BC' : '\u25B6'}
        </span>
        <ToolHeader state={ctx.state} label={ctx.toolCall.name || 'Tool Call'} />
      </button>
      {expanded ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 20 }}>
          {hasArgs ? (
            <JsonBlock label="Input" value={formatJson(args)} />
          ) : null}
          {formattedResult ? (
            <JsonBlock label="Output" value={formattedResult} />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function CompactView({ ctx }: { ctx: ToolRenderContext }) {
  const text = extractResultText(ctx)
  return (
    <div
      style={{
        fontSize: 13,
        lineHeight: 1.4,
        opacity: 0.8,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {text || ctx.toolCall.name}
    </div>
  )
}

export const defaultRenderer: ToolRenderer = {
  render(ctx: ToolRenderContext): ToolRenderResult {
    if (ctx.renderType === 'compact') {
      return {
        content: <CompactView ctx={ctx} />,
        custom: true,
      }
    }
    return {
      content: <DefaultRendererView ctx={ctx} />,
      custom: false,
    }
  },
  supportsRenderType(renderType) {
    return renderType === 'full' || renderType === 'compact'
  },
}
