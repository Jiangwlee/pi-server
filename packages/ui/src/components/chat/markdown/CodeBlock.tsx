import { memo, useCallback, useMemo, useState, type ReactNode } from 'react'
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

export type CodeBlockClassNames = {
  root?: string
  header?: string
  language?: string
  copyButton?: string
  code?: string
}

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      // clipboard API unavailable (non-HTTPS, iframe, etc.)
    })
  }, [text])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={className}
      aria-label="Copy code"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

export const CodeBlock = memo(function CodeBlock({
  children,
  streaming,
  className,
  classNames,
}: {
  children: ReactNode
  streaming?: boolean
  className?: string
  classNames?: CodeBlockClassNames
}) {
  const code = useMemo(() => toCodeText(children).replace(/\n$/, ''), [children])
  const language = useMemo(() => extractLanguageFromClassName(className), [className])

  const staticHtml = useStaticHighlight(streaming ? '' : code, language)
  const { lines } = useStreamHighlight(streaming ? code : '', language)

  let codeContent: ReactNode

  if (streaming && lines.length > 0) {
    codeContent = (
      <code className={[className, classNames?.code].filter(Boolean).join(' ')}>
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
    )
  } else if (!streaming && staticHtml) {
    // Extract just the <code> inner HTML from shiki output
    const codeMatch = /<code[^>]*>([\s\S]*)<\/code>/.exec(staticHtml)
    codeContent = codeMatch ? (
      <code
        className={[className, classNames?.code].filter(Boolean).join(' ')}
        dangerouslySetInnerHTML={{ __html: codeMatch[1] }}
      />
    ) : (
      <code className={[className, classNames?.code].filter(Boolean).join(' ')}>{code}</code>
    )
  } else {
    codeContent = (
      <code className={[className, classNames?.code].filter(Boolean).join(' ')}>{code}</code>
    )
  }

  return (
    <div className={['pi-code-block', classNames?.root].filter(Boolean).join(' ')}>
      <div className={['pi-code-block-header', classNames?.header].filter(Boolean).join(' ')}>
        <span className={['pi-code-block-lang', classNames?.language].filter(Boolean).join(' ')}>
          {language}
        </span>
        <CopyButton text={code} className={classNames?.copyButton} />
      </div>
      {codeContent}
    </div>
  )
})
