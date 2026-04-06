import { useRef, useEffect } from 'react'
import type { ToolRenderContext, ToolRenderResult, ToolRenderMetadata, ToolRenderer } from '../types.js'
import SvgTerminal from '../../../icons/SvgTerminal.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCommand(ctx: ToolRenderContext): string {
  return (ctx.toolCall.arguments as { command?: string })?.command ?? ''
}

function getOutputText(ctx: ToolRenderContext): string | null {
  if (!ctx.result) return null
  const texts = ctx.result.content
    .filter((c) => c.type === 'text')
    .map((c) => (c as { text: string }).text)
  return texts.length > 0 ? texts.join('\n') : null
}

/** Extract exit code from "Command exited with code N" at end of output */
function parseExitCode(text: string | null): number | null {
  if (!text) return null
  const m = text.match(/Command exited with code (\d+)\s*$/)
  return m ? Number(m[1]) : null
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 3) + '...' : s
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function OutputBlock({ text, isError }: { text: string; isError: boolean }) {
  const ref = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight
    }
  }, [text])

  return (
    <pre
      ref={ref}
      className="m-0 font-mono text-xs leading-relaxed overflow-auto"
      style={{
        maxHeight: 256,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        color: isError
          ? 'var(--danger, #ef4444)'
          : 'var(--tl-text-03, rgba(0,0,0,0.6))',
      }}
    >
      {text}
    </pre>
  )
}

// ---------------------------------------------------------------------------
// Full view — only output (command already visible in header via meta.status)
// ---------------------------------------------------------------------------

function BashFullView({ ctx }: { ctx: ToolRenderContext }) {
  const output = getOutputText(ctx)
  const isError = ctx.result?.isError ?? false

  if (!output) return null

  return <OutputBlock text={output} isError={isError} />
}

// ---------------------------------------------------------------------------
// Compact view (for collapsed streaming preview)
// ---------------------------------------------------------------------------

function BashCompactView({ ctx }: { ctx: ToolRenderContext }) {
  const command = getCommand(ctx)
  return (
    <div
      className="font-mono text-xs truncate"
      style={{
        opacity: 0.8,
        color: 'var(--tl-text-03, rgba(0,0,0,0.6))',
      }}
    >
      <span style={{ opacity: 0.5 }}>$</span> {command || 'bash'}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export const bashRenderer: ToolRenderer = {
  getMetadata(ctx: ToolRenderContext): ToolRenderMetadata {
    const command = getCommand(ctx)
    const truncated = truncate(command, 60)
    const output = getOutputText(ctx)
    const exitCode = parseExitCode(output)

    let status: string
    if (!command) {
      status = 'bash'
    } else if (ctx.state === 'error' && exitCode != null) {
      status = `$ ${truncated}  (exit ${exitCode})`
    } else {
      status = `$ ${truncated}`
    }

    return {
      icon: SvgTerminal,
      status,
      surfaceBackground: ctx.state === 'error' ? 'error' : 'tint',
    }
  },

  render(ctx: ToolRenderContext): ToolRenderResult {
    if (ctx.renderType === 'compact') {
      return { content: <BashCompactView ctx={ctx} />, custom: true }
    }
    return { content: <BashFullView ctx={ctx} />, custom: true }
  },

  supportsRenderType(renderType) {
    return renderType === 'full' || renderType === 'compact'
  },
}
