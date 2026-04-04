import { useEffect, useMemo, useState } from 'react'

const MAX_CACHE_SIZE = 500
const htmlCache = new Map<string, Promise<string>>()

function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function hashString(input: string): string {
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

async function renderStaticHtml(code: string, language: string): Promise<string> {
  try {
    const shiki = await import('shiki')
    try {
      return await shiki.codeToHtml(code, {
        lang: language,
        themes: { light: 'github-light', dark: 'github-dark' },
        defaultColor: false,
      })
    }
    catch {
      return await shiki.codeToHtml(code, {
        lang: 'text',
        themes: { light: 'github-light', dark: 'github-dark' },
        defaultColor: false,
      })
    }
  }
  catch {
    return `<pre><code>${escapeHtml(code)}</code></pre>`
  }
}

export function useStaticHighlight(code: string, language?: string): string | null {
  const [html, setHtml] = useState<string | null>(null)

  const normalizedLanguage = useMemo(() => {
    return language && language.trim().length > 0 ? language.trim() : 'text'
  }, [language])

  const cacheKey = useMemo(() => {
    return `${normalizedLanguage}-${hashString(code)}`
  }, [code, normalizedLanguage])

  useEffect(() => {
    let cancelled = false

    const pending = htmlCache.get(cacheKey) ?? renderStaticHtml(code, normalizedLanguage)
    if (!htmlCache.has(cacheKey)) {
      if (htmlCache.size >= MAX_CACHE_SIZE) {
        const firstKey = htmlCache.keys().next().value
        if (firstKey !== undefined) htmlCache.delete(firstKey)
      }
      htmlCache.set(cacheKey, pending)
    }

    pending
      .then((nextHtml) => {
        if (!cancelled) {
          setHtml(nextHtml)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHtml(`<pre><code>${escapeHtml(code)}</code></pre>`)
        }
      })

    return () => {
      cancelled = true
    }
  }, [cacheKey, code, normalizedLanguage])

  return html
}
