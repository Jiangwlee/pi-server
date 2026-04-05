import { useEffect, useMemo, useRef, useState } from 'react'
import type { ThemedToken } from 'shiki'
import type { ShikiStreamTokenizer as StreamTokenizer } from 'shiki-stream'

type TokenLine = ThemedToken[]

type TokenizerBundle = {
  tokenizer: StreamTokenizer
  language: string
}

function splitLines(tokens: ThemedToken[]): TokenLine[] {
  const lines: TokenLine[] = [[]]

  for (const token of tokens) {
    const parts = token.content.split('\n')
    for (let partIndex = 0; partIndex < parts.length; partIndex += 1) {
      const part = parts[partIndex]
      if (part.length > 0) {
        lines[lines.length - 1]!.push({ ...token, content: part })
      }
      if (partIndex < parts.length - 1) {
        lines.push([])
      }
    }
  }

  return lines
}

async function createTokenizer(language: string): Promise<TokenizerBundle | null> {
  try {
    const [shiki, shikiStream] = await Promise.all([import('shiki'), import('shiki-stream')])
    const highlighter = await shiki.getSingletonHighlighter({
      langs: [language, 'text'],
      themes: ['github-light', 'github-dark'],
      engine: shiki.createJavaScriptRegexEngine(),
    })

    const tokenizer = new shikiStream.ShikiStreamTokenizer({
      highlighter,
      lang: language,
      theme: 'github-light',
    })

    return { tokenizer, language }
  }
  catch {
    return null
  }
}

export function useStreamHighlight(text: string, language?: string): { lines: TokenLine[] } {
  const [lines, setLines] = useState<TokenLine[]>([])

  const normalizedLanguage = useMemo(() => {
    return language && language.trim().length > 0 ? language.trim() : 'text'
  }, [language])

  const bundleRef = useRef<TokenizerBundle | null>(null)
  const previousTextRef = useRef('')
  const tokenBufferRef = useRef<ThemedToken[]>([])
  const runIdRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    runIdRef.current += 1
    const runId = runIdRef.current

    const run = async () => {
      if (text.length === 0) {
        previousTextRef.current = ''
        tokenBufferRef.current = []
        setLines([])
        return
      }

      let bundle = bundleRef.current
      if (!bundle || bundle.language !== normalizedLanguage) {
        bundle = await createTokenizer(normalizedLanguage)
        if (cancelled || runId !== runIdRef.current) return

        bundleRef.current = bundle
        previousTextRef.current = ''
        tokenBufferRef.current = []
      }

      if (!bundle) {
        setLines([])
        return
      }

      const { tokenizer } = bundle
      const previousText = previousTextRef.current

      let chunk = text
      if (previousText.length > 0) {
        if (text.startsWith(previousText)) {
          chunk = text.slice(previousText.length)
        }
        else {
          tokenizer.clear()
          tokenBufferRef.current = []
        }
      }

      if (chunk.length === 0 && text.length > 0) {
        setLines(splitLines(tokenBufferRef.current))
        previousTextRef.current = text
        return
      }

      const result = await tokenizer.enqueue(chunk)
      if (cancelled || runId !== runIdRef.current) return

      if (result.recall > 0) {
        tokenBufferRef.current.splice(-result.recall, result.recall)
      }

      tokenBufferRef.current.push(...result.stable, ...result.unstable)
      previousTextRef.current = text
      setLines(splitLines(tokenBufferRef.current))
    }

    run().catch(() => {
      if (!cancelled) {
        setLines([])
      }
    })

    return () => {
      cancelled = true
    }
  }, [normalizedLanguage, text])

  // Dispose tokenizer on language change or unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (bundleRef.current) {
        bundleRef.current.tokenizer.clear()
        bundleRef.current = null
        previousTextRef.current = ''
        tokenBufferRef.current = []
      }
    }
  }, [normalizedLanguage])

  return { lines }
}
