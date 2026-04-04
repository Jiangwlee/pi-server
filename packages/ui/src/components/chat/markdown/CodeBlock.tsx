import { memo, useMemo, type ReactNode } from 'react'
import { useStaticHighlight } from './useStaticHighlight.js'
import { useStreamHighlight } from './useStreamHighlight.js'

export function extractLanguageFromClassName(className?: string): string {
  if (!className) return 'text'
  const match = /(?:^|\s)language-([a-zA-Z0-9_+-]+)(?:\s|$)/.exec(className)
  return match?.[1] ?? 'text'
}

function toCodeText(children: unknown): string {
  if (Array.isArray(children)) {
    return children.map((child) => (typeof child === 'string' ? child : '')).join('')
  }
  return typeof children === 'string' ? children : ''
}

export const CodeBlock = memo(function CodeBlock(
  {
    children,
    streaming,
    className,
  }: {
    children: ReactNode
    streaming?: boolean
    className?: string
  },
) {
  const code = useMemo(() => toCodeText(children).replace(/\n$/, ''), [children])
  const language = useMemo(() => extractLanguageFromClassName(className), [className])

  const staticHtml = useStaticHighlight(streaming ? '' : code, language)
  const { lines } = useStreamHighlight(streaming ? code : '', language)

  if (streaming && lines.length > 0) {
    return (
      <pre>
        <code className={className}>
          {lines.map((line, lineIndex) => (
            <span key={`line-${lineIndex}`}>
              {line.map((token, tokenIndex) => (
                <span
                  key={`line-${lineIndex}-token-${tokenIndex}`}
                  style={token.color ? { color: token.color } : undefined}
                >
                  {token.content}
                </span>
              ))}
              {lineIndex < lines.length - 1 ? '\n' : null}
            </span>
          ))}
        </code>
      </pre>
    )
  }

  if (!streaming && staticHtml) {
    return <div dangerouslySetInnerHTML={{ __html: staticHtml }} />
  }

  return (
    <pre>
      <code className={className}>{code}</code>
    </pre>
  )
})
