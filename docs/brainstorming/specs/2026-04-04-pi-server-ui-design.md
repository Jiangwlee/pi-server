# pi-server-ui: 前端组件库与示例应用

> 为 pi-server 构建 React 组件库（内部包）和 Next.js 前端应用，提供开箱即用的多用户 agent 聊天界面。

## 目录

- [设计方案](#设计方案)
  - [背景与目标](#背景与目标)
  - [Monorepo 结构](#monorepo-结构)
  - [ui 包内部架构](#ui-包内部架构)
  - [frontend 应用架构](#frontend-应用架构)
  - [部署架构](#部署架构)
  - [关键决策](#关键决策)
- [行动原则](#行动原则)
- [行动计划](#行动计划)
  - [Phase 1: Monorepo 骨架迁移](#phase-1-monorepo-骨架迁移)
  - [Phase 2: ui + frontend 开发](#phase-2-ui--frontend-开发)

---

## 设计方案

### 背景与目标

pi-server 后端已具备完整的 Auth、Session CRUD、Runtime（send/SSE/abort/history）和 Models API。当前缺少前端，用户无法通过浏览器使用。目标是构建一个 React 组件库（`@pi-server/ui`）和配套的 Next.js 应用（`@pi-server/frontend`），与 pi-server 深度集成，最终通过 Docker Compose 一键启动完整的三容器系统。

**成功标准：**
- 用户可通过浏览器完成：登录 → 创建/切换会话 → 发送消息 → 实时接收 SSE 流式回复
- 三容器（auth-server + pi-server + frontend）一键 `docker compose up` 启动
- ui 包作为内部复用层，frontend 是唯一消费者，未来可零成本拆出独立 client 包

### Monorepo 结构

```
pi-server/                         (monorepo root)
├── pnpm-workspace.yaml
├── package.json                   ← workspace scripts: dev/build/test
├── tsconfig.base.json             ← 共享 TS 编译配置
├── docker-compose.yml             ← auth-server + pi-server + frontend
├── packages/
│   ├── server/                    ← 现有 pi-server 后端平移
│   │   ├── package.json           ← name: @pi-server/server
│   │   ├── src/、tests/、docker/
│   │   └── ...
│   ├── ui/                        ← 组件库（内部包）
│   │   ├── package.json           ← name: @pi-server/ui, private: true
│   │   ├── tsconfig.json
│   │   └── src/
│   └── frontend/                  ← Next.js 前端应用
│       ├── package.json           ← name: @pi-server/frontend, private: true
│       ├── next.config.ts
│       ├── tailwind.config.ts     ← Tailwind 唯一持有者
│       └── src/
├── scripts/
│   └── smoke-test.sh              ← 迁移后的冒烟测试
```

三个包各自独立（独立 package.json、独立构建、独立测试），通过 pnpm workspace 关联。当前仅 server 对外发布，ui/frontend 均为 private: true。

**各包职责边界：**

| 包 | 输入 | 输出 | 不做什么 |
|---|---|---|---|
| **server** | HTTP 请求 | REST + SSE 响应 | 不关心前端 |
| **ui** | pi-server API 地址 | React 组件 + hooks + API client | 不持有 Tailwind 配置，不含路由/页面，不含全局样式 |
| **frontend** | ui 组件 + 用户配置 | 可部署的 Next.js 应用 | 不重新实现 API 调用逻辑 |

### ui 包内部架构

```
packages/ui/src/
├── client/               ← 纯 TS，零 React 依赖
│   ├── api-client.ts           ← REST 封装 (fetch, 类型安全, 错误处理)
│   ├── sse-client.ts           ← SSE 封装 (fetch + ReadableStream, 可控重连)
│   ├── types.ts                ← 请求/响应类型 (与 pi-server API 对齐)
│   └── index.ts
├── hooks/                ← React hooks，依赖 client/
│   ├── use-auth.ts             ← login/logout/me 状态管理
│   ├── use-sessions.ts         ← CRUD + 列表
│   ├── use-chat.ts             ← send + SSE 订阅 + 消息列表
│   ├── use-models.ts           ← 可用模型列表
│   └── index.ts
├── components/           ← 无副作用 React 组件，classNames API
│   ├── auth/                   ← LoginForm, AuthGuard
│   ├── chat/                   ← ChatPanel, MessageList, ChatInput
│   ├── session/                ← SessionList, SessionItem
│   └── index.ts
└── index.ts              ← barrel: re-export client/, hooks/, components/
```

**client 与 React 解耦**：client/ 目录是纯 TypeScript，不依赖 React。hooks/ 和 components/ 依赖 React。这样未来拆 `@pi-server/client` 几乎零成本。

**classNames API 约定**：

```tsx
// 每个组件定义自己的 ClassNames 类型
type ChatPanelClassNames = {
  root?: string
  header?: string
  messageList?: string
  composer?: string
  footer?: string
}

// 组件签名
interface ChatPanelProps {
  className?: string           // root 快捷覆盖
  classNames?: ChatPanelClassNames  // 细粒度覆盖
  // ... 业务 props
}

// 优先级：classNames.root > className > 默认类
```

组件不产生全局样式副作用，只接收 className/classNames，由 frontend 的 Tailwind 配置提供实际样式。

### frontend 应用架构

```
packages/frontend/src/
├── app/                          ← Next.js App Router
│   ├── layout.tsx                      ← 全局 layout (AuthProvider)
│   ├── page.tsx                        ← 登录后重定向
│   ├── login/
│   │   └── page.tsx                    ← LoginForm
│   ├── auth/github/callback/
│   │   └── page.tsx                    ← OAuth 回调（确认 + 跳转）
│   ├── chat/
│   │   ├── layout.tsx                  ← 侧边栏 SessionList + 主内容区
│   │   └── [sessionId]/
│   │       └── page.tsx                ← ChatPanel
│   └── api/                            ← BFF 代理（仅 SSR 需要时）
├── styles/
│   └── globals.css                     ← Tailwind directives + 主题变量
└── lib/
    └── config.ts                       ← PI_SERVER_URL, basePath 等配置
```

**页面路由与 ui 组件对应：**

| 路由 | 页面职责 | 使用的 ui 组件/hooks |
|---|---|---|
| `/login` | 邮箱密码登录 + GitHub OAuth 入口 | `LoginForm`, `useAuth` |
| `/auth/github/callback` | OAuth 回调，/auth/me 成功 = 登录完成 | `useAuth` |
| `/chat` | 侧边栏 session 列表 + 空态处理 | `SessionList`, `useSessions` |
| `/chat/[sessionId]` | 聊天主界面 | `ChatPanel`, `useChat`, `useModels` |

**空态路由处理**：GET /api/sessions 后，有会话则重定向第一个，无会话则自动创建并跳到 /chat/[id]。

**BFF 边界**：frontend 的 app/api/* 仅用于 SSR 场景。所有 agent 交互逻辑走 ui client 层直连 pi-server，不经过 BFF。

**Tailwind 配置扫描范围**：

```ts
// packages/frontend/tailwind.config.ts
content: [
  './src/**/*.{ts,tsx}',
  '../ui/src/**/*.{ts,tsx}',
]
```

### 部署架构

**生产拓扑（同域反代）：**

```
用户浏览器
    │
    ▼  :3100
┌─────────────────────────────┐
│  frontend (Next.js)          │
│  /          → Next.js 页面   │
│  /backend/* → 反代 pi-server │  ← next.config.ts rewrites
└─────────────────────────────┘
    │
    ▼  内网 :3000
  pi-server (Hono)
    │
    ▼  内网 :3001
  auth-server
```

- Next.js rewrites 把 `/backend/*` 代理到 `PI_SERVER_URL`，浏览器只看到同域请求，cookie 自然携带
- ui client 默认 `basePath='/backend'`，本地/容器/生产一致
- pi-server 加 healthcheck（`/auth/me` 返回 401 也算存活），frontend depends_on condition: service_healthy

**Docker Compose 三容器：**

| 服务 | 默认端口 | 环境变量 | 健康检查 |
|---|---|---|---|
| auth-server | 3001 | `PI_AUTH_PORT` | 已有 |
| pi-server | 3000 | `PI_SERVER_PORT` | 新增 |
| frontend | 3100 | `PI_FRONTEND_PORT` | 依赖 pi-server healthy |

### 关键决策

- **React 19 + Tailwind + Radix UI**：与 mindora-ui 同款全家桶，Minimal-Linear-Vercel 风格
- **ui 为内部包 (private: true)**：不发版，不承诺公共 API，等第二个消费者再升级
- **client 层零 React 依赖**：纯 TS，未来可零成本拆为独立 `@pi-server/client`
- **classNames 对象模式**：`classNames={{ root, header, ... }}` + `className` 快捷覆盖 root
- **同域反代**：Next.js rewrites `/backend/*` → pi-server，避免跨域 cookie 问题
- **pnpm workspace**：monorepo 标配，分阶段迁移（先骨架后 Docker）

---

## 行动原则

- **TDD: Red → Green → Refactor**：client 层和 hooks 先写测试再实现。**禁止：** 先写实现再补测试。
- **Break, Don't Bend**：接口设计有问题直接改，不建兼容层。**禁止：** deprecated/legacy/v1v2 标记。
- **Zero-Context Entry**：每个包入口文件前 20 行说清职责和关键导出。**禁止：** 文件无头部说明。
- **Explicit Contract**：API 类型、classNames 类型必须显式声明。**禁止：** 魔法默认值、隐式行为。
- **Minimum Blast Radius**：monorepo 迁移和 ui 开发严格分步，每步独立可验证。**禁止：** 一个 PR 混合迁移与功能开发。
- **Consumer-Driven Contract** `[任务专属]`：ui 的每个导出 API 从 frontend 使用场景反推。先在 frontend 写期望调用方式，再回 ui 实现。**禁止：** ui 导出 frontend 不消费的接口。
- **Vertical Slice First** `[任务专属]`：每次只打通一条端到端链路（frontend page → ui hook/client → pi-server endpoint）。先跑通 login → session list → send → SSE 再扩展。**禁止：** 并行铺多个未验证的 API。

---

## 行动计划

### Phase 1: Monorepo 骨架迁移

> 目标：将现有 pi-server 迁入 pnpm monorepo，不改任何业务逻辑，通过全量测试验证。

#### Task 1: 初始化 pnpm workspace + 迁移 server

**Files:**
- 新增: `pnpm-workspace.yaml`
- 新增: `tsconfig.base.json`
- 修改: 根 `package.json` → workspace root
- 迁移: 现有 `src/`, `tests/`, `docker/`, `scripts/` → `packages/server/`
- 修改: `packages/server/package.json` → name: `@pi-server/server`
- 修改: `packages/server/tsconfig.json` → extends tsconfig.base.json
- 删除: 根 `package-lock.json`（切换到 pnpm）

- [ ] **Step 1: 创建 monorepo 骨架** (~3 min)

  - 根 `pnpm-workspace.yaml`: `packages: ['packages/*']`
  - 根 `package.json`: `name: pi-server-monorepo`, `private: true`, workspace scripts
  - `tsconfig.base.json`: 共享编译选项（target, module, strict 等），从现有 tsconfig.json 提取

- [ ] **Step 2: 迁移 server 包** (~5 min)

  - 将 `src/`, `tests/`, `docker/`, `tsconfig.json`, `vitest.config.ts` 移入 `packages/server/`
  - `scripts/`, `.env.example`, `docker-compose.yml` 留在 monorepo 根目录（非 server 专属资产）
  - 更新 `packages/server/package.json`: name 改为 `@pi-server/server`
  - `packages/server/tsconfig.json` extends `../../tsconfig.base.json`
  - 根目录保留: `docker-compose.yml`, `scripts/`, `.env.example`, `.env`, `CLAUDE.md`, `README.md`, `.gitignore`
  - 更新所有相对路径引用（Dockerfile COPY 路径等）

- [ ] **Step 3: 安装 pnpm + 初始化** (~2 min)

  ```bash
  rm package-lock.json
  pnpm install
  ```

- [ ] **Step 4: 验证 server 包独立工作** (~2 min)

  ```bash
  pnpm --filter @pi-server/server test
  pnpm --filter @pi-server/server build
  ```

- [ ] **Step 5: 提交** (~1 min)

  ```bash
  git add -A
  git commit -m "chore: migrate to pnpm monorepo, move server to packages/server"
  ```

#### Task 2: Docker 与脚本适配 pnpm

**Files:**
- 修改: `packages/server/docker/Dockerfile` → 使用 pnpm
- 修改: `docker-compose.yml` → build context 调整
- 修改: `scripts/smoke-test.sh`（如从 server 包迁出到根）

- [ ] **Step 1: 改造 Dockerfile** (~5 min)

  - 安装 pnpm (`corepack enable && corepack prepare pnpm@latest --activate`)
  - COPY `pnpm-workspace.yaml`, `pnpm-lock.yaml`, 各包 `package.json`
  - `pnpm install --frozen-lockfile`（pnpm install 总是安装整个 workspace）
  - `pnpm --filter @pi-server/server build`
  - 保持 `npm link` 和 `chmod +x` 逻辑

- [ ] **Step 2: 更新 docker-compose.yml** (~3 min)

  - build context 改为 monorepo 根目录
  - dockerfile 路径调整

- [ ] **Step 3: 验证 Docker 构建** (~3 min)

  ```bash
  docker compose build
  ```

- [ ] **Step 4: 运行 smoke test** (~3 min)

  ```bash
  scripts/smoke-test.sh
  ```

- [ ] **Step 5: 提交** (~1 min)

  ```bash
  git commit -m "chore: adapt docker and scripts for pnpm monorepo"
  ```

### Phase 2: ui + frontend 开发

> 目标：按 Vertical Slice 逐步打通端到端链路，每个 slice 可独立验证。

#### Task 3: 初始化 ui 包 + client 层

**Files:**
- 新增: `packages/ui/package.json`
- 新增: `packages/ui/tsconfig.json`
- 新增: `packages/ui/src/client/types.ts`
- 新增: `packages/ui/src/client/api-client.ts`
- 新增: `packages/ui/src/client/sse-client.ts`
- 新增: `packages/ui/src/client/index.ts`
- 新增: `packages/ui/src/index.ts`
- 测试: `packages/ui/tests/client/api-client.test.ts`
- 测试: `packages/ui/tests/client/sse-client.test.ts`

- [ ] **Step 1: 初始化包结构** (~2 min)

  - `package.json`: name `@pi-server/ui`, private: true, peerDependencies: react + react-dom
  - `tsconfig.json` extends base

- [ ] **Step 2: 定义 types.ts** (~3 min)

  - 与 pi-server API 对齐的请求/响应类型
  - `LoginRequest`, `User`, `Session`, `SendRequest`, `SSEEvent`, `Model` 等
  - `ApiClientOptions`: `{ basePath?: string }` 默认 `/backend`

- [ ] **Step 3: 写 api-client 测试** (~3 min)

  - 测试 login/logout/me/sessions CRUD/send/models 的 fetch 调用
  - mock fetch，验证 URL 拼接、credentials: include、错误处理

- [ ] **Step 4: 实现 api-client.ts** (~5 min)

  - `class ApiClient` 或函数集合
  - 构造参数: `basePath` (默认 `/backend`)
  - 所有请求 `credentials: 'include'`
  - 错误统一抛出带 status 和 body 的 `ApiError`

- [ ] **Step 5: 写 sse-client 测试** (~3 min)

  - 测试连接建立、事件解析、断线后带 Last-Event-ID 重连

- [ ] **Step 6: 实现 sse-client.ts** (~5 min)

  - 使用 `fetch` + `ReadableStream` 自实现 SSE 解析（非原生 EventSource）
  - 原因：原生 EventSource 自动重连时携带 Last-Event-ID，但新建连接时无法手动设置该 header；fetch 方案可完全控制重连行为和 header
  - `class SSEClient`: connect(sessionId, lastEventId?) → 内部 fetch with `Last-Event-ID` header
  - 事件类型: `pi | status | error`
  - `onEvent` / `onError` / `close` 接口
  - 断线重连：记录最后收到的 event id，重连时作为 `Last-Event-ID` header 发送

- [ ] **Step 7: 验证** (~1 min)

  ```bash
  pnpm --filter @pi-server/ui test
  ```

- [ ] **Step 8: 提交** (~1 min)

  ```bash
  git commit -m "feat(ui): add client layer with api-client and sse-client"
  ```

#### Task 4: 第一条垂直切片 — Login

**Files:**
- 新增: `packages/ui/src/hooks/use-auth.ts`
- 新增: `packages/ui/src/components/auth/LoginForm.tsx`
- 新增: `packages/ui/src/components/auth/AuthGuard.tsx`
- 新增: `packages/frontend/` (初始化 Next.js 项目)
- 新增: `packages/frontend/src/app/layout.tsx`
- 新增: `packages/frontend/src/app/login/page.tsx`
- 新增: `packages/frontend/src/styles/globals.css`
- 测试: `packages/ui/tests/hooks/use-auth.test.ts`

- [ ] **Step 1: 初始化 frontend Next.js 项目** (~5 min)

  - `package.json`: name `@pi-server/frontend`, private: true, 依赖 `@pi-server/ui` (workspace:*)
  - `next.config.ts`: rewrites `/backend/:path*` → `PI_SERVER_URL/:path*`
  - `tailwind.config.ts`: content 扫描 ui + frontend
  - `globals.css`: Tailwind directives + Minimal-Linear-Vercel 主题变量

- [ ] **Step 2: 写 useAuth hook 测试** (~3 min)

  - mock ApiClient，测试 login → 更新 user 状态、logout → 清除状态、me → 初始化状态

- [ ] **Step 3: 实现 useAuth hook** (~5 min)

  - 状态: `{ user: User | null, loading: boolean, error: string | null }`
  - 方法: `login(email, password)`, `logout()`, `checkAuth()` (调 /auth/me)
  - `AuthProvider` context 包裹

- [ ] **Step 4: 实现 LoginForm 组件** (~5 min)

  - Props: `classNames?: LoginFormClassNames`, `onSuccess?: () => void`
  - 邮箱 + 密码输入 + 提交 + GitHub OAuth 链接
  - 消费 useAuth hook

- [ ] **Step 5: 实现 AuthGuard 组件** (~3 min)

  - 检查 useAuth 状态，未登录重定向到 /login
  - 在 layout.tsx 中包裹受保护路由

- [ ] **Step 6: 实现 frontend login 页面** (~3 min)

  - `app/layout.tsx`: AuthProvider 包裹
  - `app/login/page.tsx`: 使用 LoginForm，登录成功跳 /chat

- [ ] **Step 7: 端到端验证** (~3 min)

  - 启动 pi-server (dev) + frontend (dev)
  - 浏览器访问 /login → 登录 → 跳转 /chat

- [ ] **Step 8: 提交** (~1 min)

  ```bash
  git commit -m "feat: first vertical slice — login flow (ui hooks + frontend page)"
  ```

#### Task 5: frontend Docker + 三容器 Compose

**Files:**
- 新增: `packages/frontend/docker/Dockerfile`
- 修改: `docker-compose.yml` → 添加 frontend 服务 + pi-server healthcheck
- 修改: `.env.example` → 添加 frontend 相关变量

- [ ] **Step 1: 编写 frontend Dockerfile** (~5 min)

  - 多阶段构建: deps → build → runtime
  - pnpm install + next build + next start
  - 环境变量: `PI_SERVER_URL`

- [ ] **Step 2: 为 pi-server 添加 healthcheck** (~3 min)

  - docker-compose.yml 中 pi-server 服务添加 healthcheck
  - 检测 `/auth/me` 返回 401（存活但未认证）或 200

- [ ] **Step 3: 更新 docker-compose.yml** (~3 min)

  - 添加 frontend 服务，depends_on pi-server: service_healthy
  - 端口 `${PI_FRONTEND_PORT:-3100}:3000`
  - dev/prod profile 预留

- [ ] **Step 4: 验证三容器启动** (~3 min)

  ```bash
  docker compose build
  docker compose up -d
  # 访问 :3100/login → 登录成功
  ```

- [ ] **Step 5: 提交** (~1 min)

  ```bash
  git commit -m "feat: add frontend docker and three-container compose"
  ```

#### Task 6: 第二条垂直切片 — Session List + 空态路由

**Files:**
- 新增: `packages/ui/src/hooks/use-sessions.ts`
- 新增: `packages/ui/src/components/session/SessionList.tsx`
- 新增: `packages/ui/src/components/session/SessionItem.tsx`
- 新增: `packages/frontend/src/app/chat/layout.tsx`
- 新增: `packages/frontend/src/app/chat/page.tsx` (空态重定向)
- 测试: `packages/ui/tests/hooks/use-sessions.test.ts`

- [ ] **Step 1: 写 useSessions hook 测试** (~3 min)

  - mock ApiClient，测试 list/create/delete/updateLabel

- [ ] **Step 2: 实现 useSessions hook** (~5 min)

  - 状态: `{ sessions: Session[], loading: boolean }`
  - 方法: `loadSessions()`, `createSession(opts?)`, `deleteSession(id)`, `updateLabel(id, label)`

- [ ] **Step 3: 实现 SessionList + SessionItem 组件** (~5 min)

  - SessionList: 列表 + 新建按钮，classNames API
  - SessionItem: 标签、时间、删除，选中态高亮

- [ ] **Step 4: 实现 frontend chat 路由** (~5 min)

  - `chat/layout.tsx`: 侧边栏 SessionList + 主内容区 (children)
  - `chat/page.tsx`: 空态处理 — 有会话重定向第一个，无会话自动创建并跳转

- [ ] **Step 5: 端到端验证** (~3 min)

  - 登录后自动跳到 /chat/[id]，侧边栏显示会话列表

- [ ] **Step 6: 提交** (~1 min)

  ```bash
  git commit -m "feat: second vertical slice — session list with empty state routing"
  ```

#### Task 7: 第三条垂直切片 — Chat

**Files:**
- 新增: `packages/ui/src/hooks/use-chat.ts`
- 新增: `packages/ui/src/hooks/use-models.ts`
- 新增: `packages/ui/src/components/chat/ChatPanel.tsx`
- 新增: `packages/ui/src/components/chat/MessageList.tsx`
- 新增: `packages/ui/src/components/chat/ChatInput.tsx`
- 新增: `packages/frontend/src/app/chat/[sessionId]/page.tsx`
- 测试: `packages/ui/tests/hooks/use-chat.test.ts`

- [ ] **Step 1: 写 useChat hook 测试** (~3 min)

  - mock ApiClient + SSEClient
  - 测试: send → 202 → SSE 事件流 → 消息列表更新
  - 测试: 409 busy / 429 limit 处理
  - 测试: abort

- [ ] **Step 2: 实现 useChat hook** (~5 min)

  - 状态: `{ messages: Message[], status: 'idle'|'running'|'error', error: string|null }`
  - 方法: `send(message)`, `abort()`, `loadHistory()`
  - 内部: 调 client.send → 监听 SSE → 实时更新 messages
  - 加载历史: 调 client.history → 填充 messages

- [ ] **Step 3: 实现 useModels hook** (~2 min)

  - 调 client.models → 返回模型列表

- [ ] **Step 4: 实现 ChatPanel + MessageList + ChatInput** (~5 min)

  - ChatPanel: 组合 MessageList + ChatInput，classNames API
  - MessageList: 渲染消息列表，区分 user/assistant/toolResult，自动滚动到底部
  - ChatInput: 文本输入 + 发送按钮 + 运行中显示 abort 按钮

- [ ] **Step 5: 实现 frontend chat 页面** (~3 min)

  - `chat/[sessionId]/page.tsx`: 使用 ChatPanel，传入 sessionId

- [ ] **Step 6: 端到端验证** (~3 min)

  - 发送消息 → 实时 SSE 流式显示回复 → 刷新后历史恢复

- [ ] **Step 7: 提交** (~1 min)

  ```bash
  git commit -m "feat: third vertical slice — chat with SSE streaming"
  ```

#### Task 8: 补全 — Models、GitHub OAuth、AuthGuard 完善

**Files:**
- 新增: `packages/frontend/src/app/auth/github/callback/page.tsx`
- 修改: `packages/ui/src/components/chat/ChatInput.tsx` → 模型选择
- 修改: `packages/ui/src/components/auth/AuthGuard.tsx` → 完善边界

- [ ] **Step 1: GitHub OAuth 回调页** (~3 min)

  - 仅做状态确认: 调 /auth/me，成功 → 跳 /chat，失败 → 跳 /login
  - 不持久化 token

- [ ] **Step 2: 模型选择集成** (~3 min)

  - ChatInput 增加模型下拉选择（消费 useModels）
  - 或作为 ChatPanel 的可选 prop
  - **注意**：后端 send 接口目前只接受 `{ message }`，如需传 model 参数需先扩展后端接口

- [ ] **Step 3: AuthGuard 边界完善** (~2 min)

  - 处理 loading 态显示
  - 处理网络错误优雅降级

- [ ] **Step 4: 端到端验证** (~2 min)

  - GitHub OAuth 流程、模型切换、未登录访问 /chat 被拦截

- [ ] **Step 5: 提交** (~1 min)

  ```bash
  git commit -m "feat: complete oauth callback, model selector, and auth guard"
  ```

#### Task 9: 完成核查

**目的：** 防止虚报完成，确保所有链路端到端可工作。

- [ ] **Step 1: 功能验收**

  | 功能 | 验收方式 | 预期结果 |
  |---|---|---|
  | 邮箱登录 | 浏览器 /login → 输入凭证 → 提交 | 跳转 /chat |
  | GitHub OAuth | /login → 点击 GitHub → 回调 | 跳转 /chat |
  | Session 列表 | 登录后侧边栏 | 显示会话列表，可新建/删除 |
  | 空态路由 | 无会话时访问 /chat | 自动创建并跳转 |
  | 发送消息 | 输入消息 → 发送 | 202 → SSE 流式回复 |
  | 中断 | 运行中点 abort | 停止接收 |
  | 历史恢复 | 刷新页面 | 历史消息加载 |
  | 模型选择 | 下拉切换模型 | 模型列表来自 /api/models |
  | AuthGuard | 未登录访问 /chat | 重定向 /login |

- [ ] **Step 2: 工程验收**

  ```bash
  pnpm build          # 全包构建无错误
  pnpm test           # 全包测试通过
  pnpm lint           # 代码风格一致（如已配置）
  scripts/smoke-test.sh  # Docker 冒烟测试通过
  ```

- [ ] **Step 3: 部署验收**

  ```bash
  docker compose up -d              # 三容器一键启动
  # 验证：auth-server healthy → pi-server healthy → frontend 可访问
  docker compose restart pi-server  # 重启恢复
  docker compose logs frontend      # 日志可观测
  ```

- [ ] **Step 4: 对照 spec 设计方案验证无偏差**

  重新阅读本文档"设计方案"章节，确认：
  - Monorepo 结构与设计一致
  - ui 包三层分离（client/hooks/components）与设计一致
  - classNames API 约定已落地
  - 同域反代 + basePath 方案已落地
  - 所有关键决策均已实现

- [ ] **Step 5: 向用户汇报**

  ```
  ## 完成核查报告
  - 已完成 Tasks: X / X
  - 功能验收: X / 9 通过
  - 工程验收: build/test/lint/smoke 全通过 / 存在问题
  - 部署验收: 三容器启动/重启/日志 全通过 / 存在问题
  - 与 spec 偏差（如有）: [列举]
  - 结论: ✅ 全部完成 / ⚠️ 存在问题（见上）
  ```

#### Task 10: 文档更新

**Files:**
- 修改: `README.md` — 更新为 monorepo 结构，增加前端说明
- 修改: `CLAUDE.md` — 更新项目结构和开发命令
- 修改: `packages/server/README.md` — server 包独立说明（如需要）

- [ ] **Step 1: 识别需要更新的文档**

  检查 README.md、CLAUDE.md 中因 monorepo 迁移和前端新增而过时的内容。

- [ ] **Step 2: 更新文档内容**

  - README.md: monorepo 结构说明、前端快速开始、三容器部署、pnpm 命令
  - CLAUDE.md: 更新项目结构树、开发命令、包职责说明

- [ ] **Step 3: 提交**

  ```bash
  git commit -m "docs: update README and CLAUDE.md for monorepo and frontend"
  ```
