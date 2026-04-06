import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'pi-sidebar-collapsed'

export function useSidebar(defaultCollapsed = false) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return defaultCollapsed
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored !== null ? stored === 'true' : defaultCollapsed
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed))
  }, [collapsed])

  const toggle = useCallback(() => setCollapsed(c => !c), [])
  const open = useCallback(() => setCollapsed(false), [])
  const close = useCallback(() => setCollapsed(true), [])

  return { collapsed, toggle, open, close }
}
