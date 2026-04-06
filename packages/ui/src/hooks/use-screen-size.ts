import { useEffect, useState } from 'react'

export type ScreenSize = 'mobile' | 'medium' | 'desktop'

function getScreenSize(width: number): ScreenSize {
  if (width <= 724) return 'mobile'
  if (width <= 1232) return 'medium'
  return 'desktop'
}

export function useScreenSize(): ScreenSize {
  const [size, setSize] = useState<ScreenSize>(() => {
    if (typeof window === 'undefined') return 'desktop'
    return getScreenSize(window.innerWidth)
  })

  useEffect(() => {
    const handler = () => setSize(getScreenSize(window.innerWidth))
    window.addEventListener('resize', handler)
    // 初始同步一次（SSR 返回 'desktop'，客户端可能不同）
    handler()
    return () => window.removeEventListener('resize', handler)
  }, [])

  return size
}
