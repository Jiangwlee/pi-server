# Onyx Layout 改造实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前固定双栏布局升级为 Onyx 风格的三档响应式布局，补齐侧边栏折叠、移动端 overlay、状态持久化三个高优先级 gap。

**Architecture:** 新增 `useScreenSize`（断点检测）和 `useSidebar`（折叠状态 + localStorage）两个 hook；重构 `ChatLayout` 组件承载全部响应式逻辑（三档布局 + overlay + 键盘快捷键）；`chat/layout.tsx` 无需感知折叠状态，保持简单。

**Tech Stack:** React (hooks), Tailwind CSS v3 (arbitrary values `transition-[width]`), localStorage, Next.js App Router

---

## 文件改动清单

| 操作 | 路径 | 职责 |
|------|------|------|
| 新建 | `packages/ui/src/hooks/use-screen-size.ts` | SSR 安全的断点检测，返回 `'mobile' \| 'medium' \| 'desktop'` |
| 新建 | `packages/ui/src/hooks/use-sidebar.ts` | 折叠状态管理 + localStorage 持久化 |
| 修改 | `packages/ui/src/hooks/index.ts` | 导出两个新 hook |
| 重构 | `packages/ui/src/components/chat/ChatLayout.tsx` | 三档响应式布局 + overlay + 键盘快捷键 |
| 修改 | `packages/frontend/src/app/chat/layout.tsx` | 移除 `sidebarWidth` prop（现在由 ChatLayout 内部管理） |
| 修改 | `packages/frontend/tailwind.config.ts` | 添加 `transitionProperty.width` 使 `transition-[width]` 在 purge 中保留 |

---

## 断点规格（对齐 Onyx）

| 屏幕 | 宽度范围 | 侧边栏行为 |
|------|----------|------------|
| mobile | ≤ 724px | `fixed` overlay，展开从左滑入；背景加半透明遮罩 + backdrop-blur |
| medium | 725–1232px | 文档流中保留 52px 占位 div；sidebar 本体 `fixed`，展开时覆盖右侧 |
| desktop | > 1232px | 正常 flex 文档流；展开 240px / 折叠 52px，`transition-[width]` 动画 |

## 侧边栏尺寸

- 展开：240px（`w-60`）
- 折叠：52px（`w-[3.25rem]`）

## Toggle 按钮设计

- **Desktop / Medium**：侧边栏顶部，chevron 图标（`‹` 展开时，`›` 折叠时）
- **Mobile**：主内容区左上角，hamburger 图标（`☰`）；sidebar 打开时显示 `×` 关闭
- 所有按钮均为内联 SVG，不依赖图标库

---

## Task 1: Tailwind — 声明 transitionProperty.width

**Files:**
- Modify: `packages/frontend/tailwind.config.ts`

- [ ] **Step 1: 在 theme.extend 中添加 transitionProperty**

```ts
// 在 transitionDuration 下方添加：
transitionProperty: {
  width: 'width',
},
```

- [ ] **Step 2: 构建验证**

```bash
pnpm --filter @pi-server/frontend build 2>&1 | tail -5
```
Expected: 无报错

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/tailwind.config.ts
git commit -m "chore(ui): add transitionProperty.width to Tailwind config"
```

---

## Task 2: useScreenSize hook

**Files:**
- Create: `packages/ui/src/hooks/use-screen-size.ts`

- [ ] **Step 1: 创建 hook**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add packages/ui/src/hooks/use-screen-size.ts
git commit -m "feat(ui): add useScreenSize hook (mobile/medium/desktop)"
```

---

## Task 3: useSidebar hook

**Files:**
- Create: `packages/ui/src/hooks/use-sidebar.ts`

- [ ] **Step 1: 创建 hook**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add packages/ui/src/hooks/use-sidebar.ts
git commit -m "feat(ui): add useSidebar hook with localStorage persistence"
```

---

## Task 4: 导出新 hooks

**Files:**
- Modify: `packages/ui/src/hooks/index.ts`

- [ ] **Step 1: 在 hooks/index.ts 末尾追加两行**

```ts
export * from './use-screen-size.js'
export * from './use-sidebar.js'
```

- [ ] **Step 2: 确认构建无误**

```bash
pnpm -w build 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/hooks/index.ts
git commit -m "feat(ui): export useScreenSize and useSidebar"
```

---

## Task 5: 重构 ChatLayout（核心）

**Files:**
- Rewrite: `packages/ui/src/components/chat/ChatLayout.tsx`

完整实现如下。注意：

- `sidebarWidth` prop 保留但忽略（兼容旧调用方不报错）
- Toggle 按钮使用内联 SVG，无外部依赖
- Mobile 打开时，点击遮罩关闭
- 键盘快捷键 `Cmd/Ctrl + E` 全局切换折叠

- [ ] **Step 1: 完整替换 ChatLayout.tsx**

```tsx
'use client'

import { memo, useEffect, type ReactNode } from 'react'
import { useScreenSize } from '../../hooks/use-screen-size.js'
import { useSidebar } from '../../hooks/use-sidebar.js'

export type ChatLayoutClassNames = {
  root?: string
  header?: string
  body?: string
  sidebar?: string
  main?: string
}

export type ChatLayoutProps = {
  sidebar?: ReactNode
  header?: ReactNode
  children?: ReactNode
  className?: string
  classNames?: ChatLayoutClassNames
  /** @deprecated width is now managed internally */
  sidebarWidth?: number | string
}

// Chevron icons (inline SVG, no deps)
function IconChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function IconChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function IconMenu() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export const ChatLayout = memo(function ChatLayout({
  sidebar,
  header,
  children,
  className,
  classNames,
}: ChatLayoutProps) {
  const screen = useScreenSize()
  const { collapsed, toggle, close } = useSidebar(false)

  // Keyboard shortcut: Cmd/Ctrl + E
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggle])

  const isOpen = !collapsed   // semantic alias

  // ── Toggle button ──────────────────────────────────────────────────────────
  const DesktopToggle = (
    <button
      type="button"
      onClick={toggle}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary transition-colors duration-fast hover:bg-hover hover:text-text-primary"
    >
      {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
    </button>
  )

  const MobileToggle = (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle sidebar"
      className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors duration-fast hover:bg-hover hover:text-text-primary"
    >
      {isOpen ? <IconX /> : <IconMenu />}
    </button>
  )

  // ── Sidebar inner with toggle button at top ─────────────────────────────────
  const SidebarInner = (
    <div className="flex h-full flex-col">
      {/* Toggle button row */}
      <div className={[
        'flex flex-shrink-0 items-center px-2 py-2',
        collapsed ? 'justify-center' : 'justify-end',
      ].join(' ')}>
        {DesktopToggle}
      </div>
      {/* Sidebar content */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-0">
          {sidebar}
        </div>
      )}
    </div>
  )

  // ── DESKTOP (> 1232px): normal flex flow ───────────────────────────────────
  if (screen === 'desktop') {
    return (
      <section className={[classNames?.root ?? 'flex flex-col h-full', className].filter(Boolean).join(' ')}>
        {header ? <header className={classNames?.header}>{header}</header> : null}
        <div className={classNames?.body ?? 'flex flex-1 overflow-hidden'}>
          {sidebar ? (
            <aside
              className={[
                'flex-shrink-0 border-r border-border bg-panel overflow-hidden transition-[width] duration-normal',
                collapsed ? 'w-[3.25rem]' : 'w-60',
                classNames?.sidebar,
              ].filter(Boolean).join(' ')}
            >
              {SidebarInner}
            </aside>
          ) : null}
          <main className={classNames?.main ?? 'flex-1 overflow-y-auto min-w-0'}>
            {children}
          </main>
        </div>
      </section>
    )
  }

  // ── MEDIUM (725–1232px): placeholder + fixed overlay ──────────────────────
  if (screen === 'medium') {
    return (
      <section className={[classNames?.root ?? 'flex flex-col h-full', className].filter(Boolean).join(' ')}>
        {header ? <header className={classNames?.header}>{header}</header> : null}
        <div className={classNames?.body ?? 'flex flex-1 overflow-hidden'}>
          {sidebar ? (
            <>
              {/* Placeholder: keeps layout stable */}
              <div className="flex-shrink-0 w-[3.25rem]" aria-hidden />
              {/* Actual sidebar: fixed, overlays content when expanded */}
              <aside
                className={[
                  'fixed inset-y-0 left-0 z-40 border-r border-border bg-panel overflow-hidden transition-[width] duration-normal',
                  isOpen ? 'w-60' : 'w-[3.25rem]',
                  classNames?.sidebar,
                ].filter(Boolean).join(' ')}
              >
                {SidebarInner}
              </aside>
              {/* Backdrop: blur only, no color tint */}
              {isOpen && (
                <div
                  className="fixed inset-0 z-30 backdrop-blur-[2px]"
                  onClick={close}
                  aria-hidden
                />
              )}
            </>
          ) : null}
          <main className={classNames?.main ?? 'flex-1 overflow-y-auto min-w-0'}>
            {children}
          </main>
        </div>
      </section>
    )
  }

  // ── MOBILE (≤ 724px): fixed overlay with backdrop ─────────────────────────
  return (
    <section className={[classNames?.root ?? 'flex flex-col h-full', className].filter(Boolean).join(' ')}>
      {header ? (
        <header className={classNames?.header}>
          {/* Mobile hamburger prepended to header */}
          <div className="flex items-center gap-2">
            {MobileToggle}
            {header}
          </div>
        </header>
      ) : (
        /* If no header, render floating hamburger */
        <div className="absolute left-3 top-3 z-50">
          {MobileToggle}
        </div>
      )}
      <div className={classNames?.body ?? 'flex flex-1 overflow-hidden'}>
        {sidebar ? (
          <>
            <aside
              className={[
                'fixed inset-y-0 left-0 z-50 w-60 border-r border-border bg-panel overflow-hidden',
                'transition-transform duration-normal',
                isOpen ? 'translate-x-0' : '-translate-x-full',
                classNames?.sidebar,
              ].filter(Boolean).join(' ')}
            >
              <div className="flex h-full flex-col">
                {/* Close button for mobile */}
                <div className="flex flex-shrink-0 items-center justify-end px-2 py-2">
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close sidebar"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary transition-colors duration-fast hover:bg-hover hover:text-text-primary"
                  >
                    <IconX />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {sidebar}
                </div>
              </div>
            </aside>
            {/* Backdrop: semi-transparent + blur */}
            {isOpen && (
              <div
                className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                onClick={close}
                aria-hidden
              />
            )}
          </>
        ) : null}
        <main className={classNames?.main ?? 'flex-1 overflow-y-auto min-w-0'}>
          {children}
        </main>
      </div>
    </section>
  )
})
```

- [ ] **Step 2: 构建 ui 包**

```bash
pnpm --filter @pi-server/ui build 2>&1 | tail -20
```
Expected: 无 TypeScript 错误

- [ ] **Step 3: 构建 frontend**

```bash
pnpm --filter @pi-server/frontend build 2>&1 | tail -20
```
Expected: 无报错

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/components/chat/ChatLayout.tsx
git commit -m "feat(ui): Onyx-style responsive ChatLayout (3-tier breakpoint + sidebar collapse + keyboard shortcut)"
```

---

## Task 6: 更新 chat/layout.tsx

`ChatLayout` 现在内部管理 sidebar 宽度，移除旧的手工 `sidebarWidth` 传参，同时清理旧的固定 classNames（padding/border 等移到 sidebar 内容组件内部处理）。

**Files:**
- Modify: `packages/frontend/src/app/chat/layout.tsx`

- [ ] **Step 1: 检查当前文件，确认要移除的 props**

当前传给 ChatLayout 的冗余 classNames：
```
root: 'h-screen'      →  保留（高度还需要）
sidebar: 'border-r border-border bg-panel p-4'  →  border-r/bg-panel 已由 ChatLayout 内部处理，只留 p-4 给 SessionList 容器
main: 'h-screen'      →  移除（flex-1 够用了）
```

- [ ] **Step 2: 更新 chat/layout.tsx**

```tsx
'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AuthGuard, ChatLayout, SessionList, useSessions } from '@pi-server/ui'

export default function ChatLayoutPage({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { sessions, loading, loadSessions, createSession, deleteSession } = useSessions()

  useEffect(() => {
    void loadSessions()
  }, [loadSessions, pathname])

  const selectedSessionId = pathname.startsWith('/chat/') ? pathname.split('/')[2] : undefined

  return (
    <AuthGuard
      loadingFallback={<div className="flex h-screen items-center justify-center text-sm text-text-muted">Checking authentication...</div>}
      unauthenticatedFallback={<UnauthenticatedRedirect />}
      errorFallback={<div className="flex h-screen items-center justify-center text-sm text-danger">Authentication failed. Please login again.</div>}
    >
      <ChatLayout
        classNames={{
          root: 'h-screen',
        }}
        sidebar={
          <div className="p-4">
            <SessionList
              sessions={sessions}
              loading={loading}
              selectedSessionId={selectedSessionId}
              classNames={{
                header: 'mb-4',
                newButton: 'w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-opacity duration-fast hover:opacity-85',
                empty: 'text-sm text-text-muted',
                list: 'mt-3 flex flex-col gap-1',
                item: 'rounded-md px-3 py-2.5 text-sm transition-colors duration-fast cursor-pointer hover:bg-hover',
                itemSelected: 'bg-accent-soft font-medium',
                itemLabel: 'text-sm text-text-primary',
                itemMeta: 'mt-0.5 text-xs text-text-muted',
                itemDeleteButton: 'mt-1.5 text-xs text-danger opacity-0 group-hover:opacity-100 transition-opacity duration-fast',
              }}
              onCreateSession={async () => {
                const created = await createSession()
                router.push('/chat/' + created.id)
              }}
              onSelectSession={(id) => {
                router.push('/chat/' + id)
              }}
              onDeleteSession={async (id) => {
                await deleteSession(id)
                if (selectedSessionId === id) {
                  router.push('/chat')
                }
              }}
            />
          </div>
        }
      >
        {children}
      </ChatLayout>
    </AuthGuard>
  )
}

function UnauthenticatedRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/login')
  }, [router])
  return <div className="flex h-screen items-center justify-center text-sm text-text-muted">Redirecting to login...</div>
}
```

- [ ] **Step 3: 全量构建**

```bash
pnpm -w build 2>&1 | tail -20
```
Expected: 无报错

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/app/chat/layout.tsx
git commit -m "refactor(frontend): simplify ChatLayout usage, remove manual sidebarWidth"
```

---

## Task 7: 端到端冒烟测试

- [ ] **Step 1: 启动 dev server（后台模式，不阻塞）**

```bash
scripts/dev.sh dev start
```

- [ ] **Step 2: 浏览器验证三档**

| 场景 | 操作 | 期望 |
|------|------|------|
| Desktop | 打开 localhost:3100/chat | 左侧 240px 侧边栏，右侧内容正常 |
| Desktop | 点击 `‹` 按钮 | 侧边栏折叠到 52px，带动画 |
| Desktop | 刷新页面 | 折叠状态保持（localStorage 持久化） |
| Desktop | Cmd/Ctrl+E | 切换折叠/展开 |
| 缩窗到 < 1232px | 展开侧边栏 | 侧边栏 fixed 覆盖内容，有 backdrop-blur |
| 缩窗到 < 724px | 点击 ☰ 按钮 | 侧边栏从左滑入，有半透明遮罩 |
| Mobile | 点击遮罩 | 侧边栏关闭 |

- [ ] **Step 3: 构建验证（无运行时错误）**

```bash
pnpm -w build 2>&1 | grep -E "error|Error|warning" | head -20
```

---

## 注意事项

1. **Mobile header 渲染逻辑**：ChatLayout 在 mobile 模式下，如果传了 `header` prop，会将 MobileToggle 和 header 内容并排；如果没有 header，则渲染 `absolute` 定位的浮动按钮。`chat/layout.tsx` 目前没传 header 给 ChatLayout，所以 mobile 下会用浮动按钮。
2. **`'use client'` 指令**：ChatLayout.tsx 现在用了 hooks，必须加 `'use client'`。
3. **SSR 水合**：`useScreenSize` 服务端返回 `'desktop'`，客户端 useEffect 会同步一次实际值。这可能导致 mobile 设备上首帧闪烁（短暂显示 desktop 布局）。可接受，Onyx 同样有此行为。
4. **折叠态内容隐藏**：Desktop/Medium 折叠后，sidebar 内容通过 `!collapsed &&` 条件渲染隐藏，不是 CSS 隐藏——避免在 52px 宽度内溢出。
