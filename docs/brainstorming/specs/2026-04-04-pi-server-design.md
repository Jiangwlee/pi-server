# Pi Server

> 为 pi coding-agent 提供多用户隔离与统一 LLM 凭证的 HTTP 后端框架，解决每次开发 pi 应用时重复解决认证与会话隔离的痛点。

## 目录

- [设计方案](#设计方案)
  - [背景与目标](#背景与目标)
  - [架构](#架构)
  - [认证模型](#认证模型)
  - [路径安全模型](#路径安全模型)
  - [数据模型](#数据模型)
  - [API 设计](#api-设计)
  - [Session Runtime](#session-runtime)
  - [关键决策](#关键决策)
- [行动原则](#行动原则)
- [行动计划](#行动计划)
  - [文件结构设计](#文件结构设计)
  - [任务步骤](#任务步骤)

---

## 设计方案

### 背景与目标

pi coding-agent 官方不提供 HTTP 服务模式，也没有多用户隔离和统一 LLM 凭证管理。每开发一个基于 pi 的 Web 应用，都需要重复解决这两个问题。

pi-server 作为后端框架，提供：

1. **多用户隔离** — GitHub OAuth / 邮箱密码双认证，用户与 session 绑定存 DB
2. **统一 LLM 凭证** — 服务端全局共享 AuthStorage + ModelRegistry
3. **Session Runtime** — 参考 mindora-ui TeamRegistry 的 on-demand 模式，按需拉起 pi session

成功标准：上层应用只需调 HTTP API 即可获得完整 pi coding-agent 能力，无需关心认证和会话管理细节。

### 架构

```
┌──────────────────────────────────────────────────┐
│              HTTP Layer (Hono + Node.js)          │
│  认证中间件: cookie session → userId              │
├──────────────────────────────────────────────────┤
│              Auth Layer                           │
│  GitHubOAuthProvider | EmailPasswordProvider      │
│  统一 cookie 格式，下游不关心认证方式              │
├──────────────────────────────────────────────────┤
│              Binding Layer                        │
│  SQLite: users 表 + sessions 表                   │
│  userId ↔ { sessionPath(相对), cwd(相对), label } │
│  路径安全: 相对路径 + 用户根目录隔离               │
├──────────────────────────────────────────────────┤
│              Runtime Layer (≈ TeamRegistry 精简)  │
│  on-demand: DB lookup → SessionManager.open()     │
│  → createAgentSession() → prompt() → SSE → dispose│
│  串行保护 + 环形缓冲 SSE                          │
├──────────────────────────────────────────────────┤
│              Pi SDK (全局共享)                     │
│  AuthStorage.create() 单例                        │
│  ModelRegistry.create(authStorage) 单例           │
└──────────────────────────────────────────────────┘
```

### 部署模式与 LLM 凭证管理

pi-server 通过启动参数支持三种部署形态：

**单机模式（默认）：**
```bash
pi-server
```
- 直接读本地 `~/.pi/agent/auth.json`（pi CLI 写入的）
- 管理员在本机用 `pi /login <provider>` 管理 LLM 凭证

**Auth Server 模式（`--auth-server`）：**
```bash
pi-server --auth-server --port 3001
```
- 只启动一个 `GET /auth.json` 端点，读本地 auth.json 并发布
- 端点需携带 Bearer token 认证（`AUTH_SERVER_TOKEN` 环境变量），防止未授权拉取 LLM 凭证
- 不启动认证层、session runtime、API 路由等任何其他功能
- 管理员在本机用 pi CLI 正常 login，AuthStorage 自动处理 token refresh
- 极轻量，用于分布式部署中的凭证中心

**分布式模式（`--auth-proxy-url`）：**
```bash
pi-server --auth-proxy-url http://auth-host:3001 --auth-proxy-token <token>
```
- 启动定时拉取 auth.json（每 30s），请求携带 Bearer token
- 拉取后**全量替换**内存中的 AuthStorage（replace-all 语义，源端删除的 provider 同步清除）
- 首次拉取失败时 server 不绑定端口，日志报错退出（fail-closed），避免带着空凭证接受请求
- 后续拉取失败时保留上次成功数据，日志告警，不影响服务
- 不持有本地 auth.json，不执行 login，不执行 token refresh
- 其余行为与单机模式完全一致

**分布式部署模型（重要）：**

每个 pi-server 实例是完全独立的——有自己的用户、自己的 DB、自己的 session 和 workspace。**不是**同一个应用的水平扩容，没有负载均衡，没有跨节点状态共享。唯一共享的是 LLM 凭证（通过 Auth Server）。

```
                          ┌───────────────────────┐
                          │  Auth Server (机器 A)   │
                          │  pi-server --auth-server│
                          │  ~/.pi/agent/auth.json  │
                          │  GET /auth.json (需认证) │
                          └───────────┬─────────────┘
                                      │ 每 30s 拉取 (Bearer token)
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                  ▼
            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
            │ pi-server B  │ │ pi-server C  │ │ pi-server D  │
            │ 独立用户/DB   │ │ 独立用户/DB   │ │ 独立用户/DB   │
            │ --auth-proxy │ │ --auth-proxy │ │ --auth-proxy │
            │ -url A:3001  │ │ -url A:3001  │ │ -url A:3001  │
            └──────────────┘ └──────────────┘ └──────────────┘
```

### 认证模型

支持两种认证方式，统一 cookie 格式：

**GitHub OAuth:**
- `GET /auth/github` → 生成随机 state 写入短期 cookie（`oauth_state`, Max-Age 10 分钟, HttpOnly）→ 302 到 GitHub（带 state 参数）
- `GET /auth/github/callback` → 校验 callback state 与 cookie 中的 state 一致（CSRF 防护）→ 换 token → 查/建用户 → 清除 oauth_state cookie → 设置认证 cookie
- 未来可扩展更多 OAuth provider

**邮箱密码:**
- `POST /auth/login` → email + password → bcrypt 校验 → 设置 cookie
- 用户由管理员通过 CLI 创建: `pi-server add-user --email x --password y`

**Cookie 方案:**
- 使用 Hono 的 `hono/cookie` + `signed cookie`，签名密钥为 `SESSION_SECRET` 环境变量
- Cookie value: `userId`（签名防篡改，不需要加密——userId 本身不是秘密）
- `Max-Age`: 7 天，过期重新登录。内网场景不做 refresh token
- `HttpOnly`, `SameSite=Lax`, `Path=/`
- 两种认证方式设置完全相同的 cookie，中间件只看 cookie 不关心来源

### 路径安全模型

所有用户文件限制在固定根目录下，前端传入**相对路径**，后端拼接并校验。

```
{PI_SERVER_DATA}/users/{userId}/
├── sessions/
│   └── {相对session_dir}/session.jsonl
└── workspace/
    └── {相对cwd}/
```

安全校验（边界层）：
- 相对路径不含 `..`、不以 `/` 开头
- 拼接后 resolve 的绝对路径必须在用户根目录内
- 不存在的目录由后端 mkdirSync 创建

默认路径规则：
- 未传 cwd → `default/`
- 未传 session_dir → `{cwd}/{session_id}/`
- 即：`POST /api/sessions {}` 生成 `sessions/default/{sid}/session.jsonl` + `workspace/default/`

### 数据模型

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,       -- UUID
  email         TEXT UNIQUE,            -- 邮箱登录用，OAuth 用户可为 NULL
  password_hash TEXT,                   -- bcrypt，OAuth 用户为 NULL
  auth_provider TEXT NOT NULL,          -- 'github' | 'email'
  provider_id   TEXT,                   -- GitHub user id
  login         TEXT NOT NULL,          -- 显示名
  avatar_url    TEXT,
  created_at    INTEGER NOT NULL
);

CREATE TABLE sessions (
  id           TEXT PRIMARY KEY,        -- 后端生成 s_{timestamp}_{random}
  user_id      TEXT NOT NULL REFERENCES users(id),
  session_dir  TEXT NOT NULL,           -- 相对路径，如 'projects/my-app/chat-1'
  cwd          TEXT NOT NULL,           -- 相对路径，如 'projects/my-app'
  label        TEXT,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  deleted_at   INTEGER                  -- soft delete，NULL = 活跃
);
```

### API 设计

```
# 认证
GET  /auth/github                       GitHub OAuth 发起
GET  /auth/github/callback              OAuth 回调
POST /auth/login                        邮箱密码登录
POST /auth/change-password              修改密码 { oldPassword, newPassword } (需登录)
GET  /auth/me                           当前用户信息
POST /auth/logout                       登出

# 会话 CRUD
GET    /api/sessions                    当前用户 session 列表 (过滤 deleted_at IS NULL)
POST   /api/sessions                    创建 { cwd?, session_dir?, label? }
PATCH  /api/sessions/:id                更新 label
DELETE /api/sessions/:id                soft delete (running 状态拒绝)

# 会话历史
GET    /api/sessions/:id/history        从 jsonl 读取并转换消息列表

# 运行时
POST   /api/sessions/:id/send           发送消息 { message } → 202 异步
GET    /api/sessions/:id/events         SSE 事件流 (支持断线重连, 环形缓冲补发)
POST   /api/sessions/:id/abort          中止推理
GET    /api/sessions/:id/status         idle | running | error

# 模型
GET    /api/models                      可用模型列表
```

### Session Runtime

参考 mindora-ui TeamRegistry，去掉 plan/pipeline 相关逻辑：

**SessionRegistry 核心行为:**

1. **on-demand 拉起** — 收到 send 请求时：
   - 从 DB 读 session_dir + cwd
   - 拼接为绝对路径，确保目录存在
   - `SessionManager.open(absoluteSessionPath)` 恢复会话
   - `createAgentSession({ cwd, tools(cwd), modelRegistry, ... })`
   - `session.subscribe()` → SSE 广播
   - `await session.prompt(message)`
   - 完成后释放 session 引用

2. **串行保护** — 同一 session status === 'running' 时拒绝新 send (409)

3. **SSE 广播** — 环形缓冲（200 条），支持断线重连补发

4. **超时保护** — 15 分钟无响应自动 abort

5. **工具集** — 参考 mindora-ui，per-session cwd:
   ```
   createReadTool(cwd), createWriteTool(cwd), createGrepTool(cwd),
   createFindTool(cwd), createLsTool(cwd), createBashTool(cwd)
   ```

6. **全局共享 Pi 资源** — AuthStorage.create() + ModelRegistry.create(authStorage)，进程级单例

7. **Graceful shutdown** — 参考 TeamRegistry.dispose()：
   - 监听 `SIGTERM`/`SIGINT`
   - 遍历所有 running session，调用 `session.abort()`，向 SSE 客户端推送 `event: status { "status": "idle" }` 后关闭连接
   - status 是纯内存状态，进程重启后自然重置为 idle，不需要额外恢复逻辑

8. **SSE 错误隔离** — 广播时每个 client handler 独立 try/catch，单个 client 异常不影响其他 client，异常 handler 自动移除

9. **并发 session 限制** — per-user 同时 running session 数上限（默认 3，可配置 `MAX_CONCURRENT_SESSIONS_PER_USER`），超限返回 429

### 消息与事件协议

**GET /api/sessions/:id/history 响应格式:**

Pi SDK 的 session.jsonl 包含多种 entry 类型（message、model_change、thinking_level_change 等）。history API 透传 jsonl 中 role 为 user/assistant/toolResult 的消息条目，过滤内部管理条目：

```json
{
  "messages": [
    { "role": "user", "content": "...", "timestamp": 1743782400 },
    { "role": "assistant", "content": [...], "usage": {...} },
    { "role": "toolResult", "toolCallId": "...", "content": [...] }
  ]
}
```

消息结构直接使用 Pi SDK 的 `AgentMessage` 类型，不做二次转换，保持与 SDK 事件流的一致性。

**GET /api/sessions/:id/events SSE 协议:**

```
event: pi
id: {seq}
data: { "seq": 42, "type": "message_update", "payload": { ... } }

event: pi
id: {seq}
data: { "seq": 43, "type": "tool_execution_start", "payload": { "toolName": "read" } }

event: status
data: { "status": "idle" }
```

- `event: pi` — Pi SDK AgentSessionEvent 透传，payload 即 SDK 事件对象
- `event: status` — session 状态变更
- `event: error` — 异步错误通知（session 拉起失败、LLM 凭证过期等）
- `id` 字段 = seq 序号，客户端断线重连时发送 `Last-Event-ID`，服务端从环形缓冲中找到该 seq 之后的事件补发

状态事件格式：
```
event: status
data: { "status": "idle" | "running" | "error" }

event: error
data: { "code": "session_create_failed" | "llm_auth_error" | "timeout", "message": "..." }
```

### 关键决策

- **SDK-first 而非 RPC** — 同进程调用，零序列化开销，类型安全。RPC 作为未来备选（需进程隔离时）。
- **后端只是框架** — 不预设业务逻辑，路径由调用方决定（传相对路径），后端只管绑定和运行时。
- **Soft delete** — 删除 session 只标记 deleted_at，不删 jsonl 文件，数据安全由调用方负责。
- **路径安全靠相对路径 + 根目录隔离** — 不做 chroot/namespace，内网信任环境足够。
- **Cookie 统一** — 双认证方式设置相同格式的 cookie，下游中间件无需关心认证来源。
- **内网信任模型** — 有意不做 cookie token rotation、session binding、symlink 防护。Cookie 被窃取可重放（7 天有效期），workspace 内 symlink 攻击由调用方负责。这是内网场景下的安全降级，不是遗漏。
- **请求体限制** — Hono body size limit 中间件，`POST /send` 限制 1MB，防止误操作或恶意超长消息。

### 后续迭代（不在 v1 范围内）

- History API 分页（`?limit=50&before=<timestamp>`）
- Context usage tracking（参考 TeamRegistry.buildLeadRuntimeSnapshot）
- 健康检查端点（`GET /health`）
- 结构化日志

---

## 行动原则

- **TDD: Red → Green → Refactor** — 每个模块先写失败测试再实现。**禁止：** 先写实现再补测试。
- **Break, Don't Bend** — 接口设计错误时直接修正，不建兼容层。**禁止：** deprecated/legacy/v1v2 标记。
- **Zero-Context Entry** — 每个文件前 20 行说明职责、边界和关键接口。**禁止：** 文件无头部说明。
- **Fail at the Boundary** — 路径校验、认证校验、请求参数校验全部在边界层完成，内部函数信任输入。**禁止：** 内部函数防御性校验。
- **Minimum Blast Radius** — 每个 Task 只解决一个明确问题，逐步构建可运行系统。**禁止：** 一次提交混合多个无关改动。

---

## 行动计划

### 文件结构设计

| 操作 | 文件路径 | 职责 |
|------|----------|------|
| 新增 | `src/index.ts` | 入口：Hono app 组装、中间件注册、启动服务 |
| 新增 | `src/config.ts` | 环境变量 / 配置读取 (PORT, DATA_DIR, GITHUB_CLIENT_ID 等) |
| 新增 | `src/db.ts` | SQLite 初始化 + migration (users/sessions 表) |
| 新增 | `src/auth/middleware.ts` | 认证中间件：cookie → userId，未登录 → 401 |
| 新增 | `src/auth/github.ts` | GitHub OAuth 路由 (/auth/github, /auth/github/callback) |
| 新增 | `src/auth/email.ts` | 邮箱密码路由 (/auth/login) |
| 新增 | `src/auth/types.ts` | 认证相关类型定义 |
| 新增 | `src/stores/user-store.ts` | users 表 CRUD |
| 新增 | `src/stores/session-store.ts` | sessions 表 CRUD (含 soft delete、路径拼接) |
| 新增 | `src/routes/sessions.ts` | /api/sessions CRUD 路由 (依赖 session-store + session-registry 检查 running 状态) |
| 新增 | `src/runtime/history-reader.ts` | 读取 session.jsonl 并过滤/转换为 API 消息格式 |
| 新增 | `src/routes/runtime.ts` | /api/sessions/:id/send,events,abort,status,history 路由 |
| 新增 | `src/routes/models.ts` | /api/models 路由 |
| 新增 | `src/runtime/session-registry.ts` | 核心：on-demand session 管理、SSE 广播、串行保护 |
| 新增 | `src/runtime/pi-provider.ts` | 全局 Pi SDK 资源单例 (AuthStorage, ModelRegistry)；支持三种模式：本地 / auth-proxy 定时拉取 / auth-server 只读 |
| 新增 | `src/runtime/path-resolver.ts` | 相对路径校验、绝对路径拼接、目录创建 |
| 新增 | `src/cli.ts` | 管理员 CLI: add-user, list-users, reset-password |
| 新增 | `tests/path-resolver.test.ts` | 路径安全校验测试 |
| 新增 | `tests/session-store.test.ts` | session CRUD + soft delete 测试 |
| 新增 | `tests/session-registry.test.ts` | runtime 核心逻辑测试 |
| 新增 | `tests/auth.test.ts` | 认证流程测试 |
| 新增 | `package.json` | 项目配置 |
| 新增 | `tsconfig.json` | TypeScript 配置 |

### 任务步骤

#### Task 1: 项目脚手架 + 配置

**Files:**
- 新增: `package.json`, `tsconfig.json`, `src/config.ts`

- [ ] **Step 1: 初始化项目** (~3 min)

  ```bash
  npm init, 安装依赖: hono, @hono/node-server, better-sqlite3, bcrypt, arctic (OAuth)
  Dev: typescript, vitest, @types/*
  ```

- [ ] **Step 2: config.ts** (~3 min)

  - `loadConfig(): Config`
  - 从环境变量/CLI 参数读取:
    - `PORT`, `PI_SERVER_DATA` (默认 `./data`)
    - `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `SESSION_SECRET` (最小 32 字节)
    - `SSE_RING_BUFFER_SIZE` (默认 200), `MAX_CONCURRENT_SESSIONS_PER_USER` (默认 3)
    - `--auth-server`: 布尔 flag，启用 Auth Server 模式
    - `AUTH_SERVER_TOKEN`: auth-server 模式下的 Bearer token（auth-server 模式必填）
    - `--auth-proxy-url`: Auth Server 地址（如 `http://auth-host:3001`）
    - `--auth-proxy-token`: 拉取 auth.json 时携带的 Bearer token（与 AUTH_SERVER_TOKEN 配对）
  - 边界校验: auth-server 模式下需 PORT + AUTH_SERVER_TOKEN；正常模式下必填项缺失时 throw，SESSION_SECRET 长度不足时 throw
  - `--auth-server` 和 `--auth-proxy-url` 互斥，同时设置时 throw

- [ ] **Step 3: 提交** (~1 min)

#### Task 2: 数据库 + Store 层

**Files:**
- 新增: `src/db.ts`, `src/stores/user-store.ts`, `src/stores/session-store.ts`
- 测试: `tests/session-store.test.ts`

- [ ] **Step 1: 写 session-store 失败测试** (~3 min)

  测试用例:
  - 创建 session → 查询返回
  - soft delete → 查询不返回
  - 用户 A 无法查到用户 B 的 session
  - 默认路径生成逻辑 (无 cwd → `default/`, 无 session_dir → `{cwd}/{sid}/`)

- [ ] **Step 2: 实现 db.ts** (~3 min)

  - `initDb(dbPath: string): Database`
  - 建表 SQL (users + sessions)，用 `db.exec()` 执行 migration

- [ ] **Step 3: 实现 user-store.ts** (~3 min)

  - `createUser(user): User`
  - `findByProviderId(provider, providerId): User | null`
  - `findByEmail(email): User | null`
  - `findById(id): User | null`

- [ ] **Step 4: 实现 session-store.ts** (~5 min)

  - `createSession(userId, { cwd?, sessionDir?, label? }): Session` — 含默认路径生成
  - `listByUser(userId): Session[]` — 过滤 deleted_at IS NULL
  - `findById(sessionId, userId): Session | null` — 含所有权校验
  - `softDelete(sessionId, userId): boolean`
  - `updateLabel(sessionId, userId, label): boolean`

- [ ] **Step 5: 运行测试确认通过** (~1 min)

- [ ] **Step 6: 提交** (~1 min)

#### Task 3: 路径安全

**Files:**
- 新增: `src/runtime/path-resolver.ts`
- 测试: `tests/path-resolver.test.ts`

- [ ] **Step 1: 写失败测试** (~3 min)

  测试用例:
  - 正常相对路径 → 正确拼接
  - `../` 遍历 → throw
  - 绝对路径 `/etc/passwd` → throw
  - 空路径 → 使用默认值
  - resolve 后路径必须以用户根目录为前缀

- [ ] **Step 2: 实现 path-resolver.ts** (~3 min)

  - `resolveSessionPath(dataDir, userId, sessionDir): string` — 返回 session.jsonl 绝对路径
  - `resolveWorkspacePath(dataDir, userId, cwd): string` — 返回 workspace 绝对路径
  - `validateRelativePath(input: string): string` — 校验 + 规范化
  - `ensureDirs(sessionPath, workspacePath): void` — mkdirSync

- [ ] **Step 3: 运行测试确认通过** (~1 min)

- [ ] **Step 4: 提交** (~1 min)

#### Task 4: 认证层

**Files:**
- 新增: `src/auth/types.ts`, `src/auth/middleware.ts`, `src/auth/github.ts`, `src/auth/email.ts`
- 测试: `tests/auth.test.ts`

- [ ] **Step 1: 写 middleware 失败测试** (~3 min)

  测试用例:
  - 有效 cookie → c.get('userId') 可获取
  - 无 cookie → 401
  - 过期 cookie → 401

- [ ] **Step 2: 实现 auth/types.ts** (~2 min)

  - `AuthUser` 类型
  - Cookie session 结构

- [ ] **Step 3: 实现 auth/middleware.ts** (~3 min)

  - Hono middleware: 解析 signed cookie → 查 userId → 设 `c.set('userId', id)`
  - `/auth/*` 路径跳过校验

- [ ] **Step 4: 实现 auth/github.ts** (~5 min)

  - `GET /auth/github` → 生成随机 state → 写入短期 cookie `oauth_state`（Max-Age 10min, HttpOnly）→ 302 到 GitHub
  - `GET /auth/github/callback` → 校验 state 参数与 `oauth_state` cookie 一致 → 用 arctic 库换 token → 获取 profile → upsert user → 清除 oauth_state cookie → 设置认证 cookie → 302 回前端
  - 使用 arctic 库的 `GitHub` class

- [ ] **Step 5: 实现 auth/email.ts** (~5 min)

  - `POST /auth/login` → `{ email, password }` → bcrypt.compare → 设置 cookie → 失败返回 401
  - `POST /auth/change-password` → 需已登录（经过 auth middleware）→ `{ oldPassword, newPassword }` → bcrypt.compare(old) → bcrypt.hash(new) → 更新 DB → 200
    - 仅 `auth_provider = 'email'` 的用户可调用，OAuth 用户返回 400
    - oldPassword 校验失败返回 401

- [ ] **Step 6: 运行测试确认通过** (~1 min)

- [ ] **Step 7: 提交** (~1 min)

#### Task 5: 管理员 CLI

**Files:**
- 新增: `src/cli.ts`

- [ ] **Step 1: 实现 CLI** (~5 min)

  - 使用 `process.argv` 简单解析 (无需框架)
  - `pi-server add-user --email <email> --password <password> --login <displayName>`
    → bcrypt hash → 插入 users 表 (auth_provider = 'email')
  - `pi-server list-users` → 输出用户列表
  - `pi-server reset-password --email <email> --password <newPassword>`
  - 复用 `db.ts` 和 `user-store.ts`

- [ ] **Step 2: 提交** (~1 min)

#### Task 6: Pi SDK 全局资源

**Files:**
- 新增: `src/runtime/pi-provider.ts`
- 测试: `tests/pi-provider.test.ts`

- [ ] **Step 1: 写失败测试** (~3 min)

  测试用例:
  - 无 authProxyUrl → 使用本地 AuthStorage.create()
  - 有 authProxyUrl → 首次拉取成功 → AuthStorage 内容与远程一致
  - 有 authProxyUrl → 首次拉取失败 → throw（fail-closed，阻止 server 启动）
  - 全量替换语义: 远程删除了 provider X → 本地 AuthStorage 中 X 也被清除
  - 后续拉取失败 → 保留上次成功的数据，不 crash
  - 拉取时携带 Bearer token
  - dispose() → 清理定时器

- [ ] **Step 2: 实现 pi-provider.ts** (~5 min)

  - `PiProvider` class (单例)
  - 构造参数: `{ authProxyUrl?: string, authProxyToken?: string }`
  - 三种模式:
    - **无 authProxyUrl** → `AuthStorage.create()` 读本地 auth.json
    - **有 authProxyUrl** → `AuthStorage.inMemory()` + `async init()` 执行首次拉取（失败则 throw）+ 启动 `setInterval(30_000)` 定时拉取 `GET {authProxyUrl}/auth.json`（携带 `Authorization: Bearer {token}`）。拉取后全量替换：解析远程数据，删除本地有但远程没有的 provider，设置远程有的 provider（replace-all 语义）
    - **auth-server 模式** → 由 index.ts 直接处理，PiProvider 不参与
  - `getModelRegistry(): ModelRegistry`
  - `getAuthStorage(): AuthStorage`
  - `getAvailableModels(): Model[]`
  - `dispose(): void` — 清理定时器

- [ ] **Step 3: 运行测试确认通过** (~1 min)

- [ ] **Step 4: 提交** (~1 min)

#### Task 7: Session Runtime (核心)

**Files:**
- 新增: `src/runtime/session-registry.ts`
- 测试: `tests/session-registry.test.ts`

- [ ] **Step 1: 写失败测试** (~5 min)

  **Mock 策略:** SessionRegistry 通过构造函数注入 Pi SDK 工厂函数 `createSession: (sessionPath, cwd) => SdkSession`。测试中传入 mock 工厂，返回 fake SdkSession（prompt 立即 resolve，subscribe 回调预设事件序列）。不依赖真实 LLM 凭证。

  测试用例:
  - send 时 status 从 idle → running → idle
  - running 时再 send → 409
  - per-user 并发 session 超限 → 429
  - abort 正常工作
  - SSE 事件能被 client handler 接收
  - SSE 广播时单个 handler 异常不影响其他 handler
  - 环形缓冲不超过配置大小
  - 断线重连: 传入 lastSeq，只收到之后的事件
  - session.prompt() reject → status 变为 error，SSE 推送 error 事件
  - dispose() → 所有 running session abort，SSE 客户端收到 idle 状态后关闭

- [ ] **Step 2: 实现 session-registry.ts** (~5 min)

  参考 mindora-ui `TeamRegistry`，核心结构:

  ```typescript
  interface SessionEntry {
    sdkSession: SdkSession | null
    status: 'idle' | 'running' | 'error'
    sseClients: Set<SSEClientHandler>
    ringBuffer: SSEEnvelope[]
    seq: number
    timer: ReturnType<typeof setTimeout> | null
  }
  ```

  核心方法:
  - `send(sessionId, userId, message): void` — 查 DB → 校验所有权 → 检查 per-user 并发限制 → 拉起 session → prompt
  - `abort(sessionId): void`
  - `getStatus(sessionId): Status`
  - `subscribe(sessionId, handler): unsubscribe` — SSE client 注册，广播时 per-handler try/catch
  - `dispose(): void` — graceful shutdown，abort 所有 running session
  - `private runSession(entry, sessionPath, cwd, message)` — 核心流程，参考 TeamRegistry.runSdkSession()，异常时推送 error 事件

- [ ] **Step 3: 运行测试确认通过** (~1 min)

- [ ] **Step 4: 提交** (~1 min)

#### Task 8: HTTP 路由组装

**Files:**
- 新增: `src/routes/sessions.ts`, `src/routes/runtime.ts`, `src/routes/models.ts`, `src/index.ts`

- [ ] **Step 1: 实现 routes/sessions.ts** (~3 min)

  - `GET /api/sessions` → sessionStore.listByUser(userId)
  - `POST /api/sessions` → sessionStore.createSession(userId, body)
  - `PATCH /api/sessions/:id` → sessionStore.updateLabel(id, userId, label)
  - `DELETE /api/sessions/:id` → 检查 status !== running → sessionStore.softDelete(id, userId)

- [ ] **Step 2: 实现 routes/runtime.ts** (~5 min)

  - `POST /api/sessions/:id/send` → registry.send() → 202
  - `GET /api/sessions/:id/events` → SSE 流: registry.subscribe() + 环形缓冲回放
  - `POST /api/sessions/:id/abort` → registry.abort()
  - `GET /api/sessions/:id/status` → registry.getStatus()
  - `GET /api/sessions/:id/history` → 读 jsonl, 转换消息格式返回

- [ ] **Step 3: 实现 routes/models.ts** (~2 min)

  - `GET /api/models` → piProvider.getAvailableModels()

- [ ] **Step 4: 实现 index.ts** (~5 min)

  - 加载配置，根据模式分支:

  - **`--auth-server` 模式:**
    - 只注册 `GET /auth.json` → 校验 `Authorization: Bearer {AUTH_SERVER_TOKEN}` → 读本地 `~/.pi/agent/auth.json` 返回 JSON
    - 无 token 或 token 不匹配 → 401
    - 启动服务，完毕

  - **正常模式 (含可选 `--auth-proxy-url`):**
    - 初始化 DB、创建各 store 实例
    - 创建 PiProvider({ authProxyUrl, authProxyToken })
    - `await piProvider.init()` — auth-proxy 模式下执行首次拉取，失败则进程退出（fail-closed）
    - 创建 SessionRegistry
    - 组装 Hono app:
      - CORS 中间件 (`hono/cors`)
      - Body size limit 中间件 (1MB)
      - auth 路由（无需认证）
      - 认证中间件
      - API 路由（需认证）
    - 注册 SIGTERM/SIGINT → `registry.dispose()` + `piProvider.dispose()`
    - `serve({ fetch: app.fetch, port })`

- [ ] **Step 5: 端到端手动验证** (~5 min)

  ```bash
  # 1. 启动服务
  # 2. CLI 创建测试用户
  # 3. 邮箱密码登录
  # 4. 创建 session
  # 5. 发送消息，观察 SSE 事件流
  # 6. 检查 jsonl 持久化
  ```

- [ ] **Step 6: 提交** (~1 min)

#### Task 9: 完成核查

- [ ] **Step 1: 对照 spec 逐 Task 核查**

  打开本文档的"任务步骤"列表，逐一确认每个 Task 的每个 Step 均已完成。

- [ ] **Step 2: 对照 spec 设计方案验证无偏差**

  重新阅读"设计方案"章节，确认：
  - 架构分层与设计一致
  - 双认证 + cookie 统一已实现
  - 路径安全模型已实现
  - Session Runtime on-demand 模式已实现
  - API 全部实现

- [ ] **Step 3: 向用户汇报**

  ```
  ## 完成核查报告
  - 已完成 Tasks: X / X
  - 未完成 Steps（如有）: [列举]
  - 与 spec 偏差（如有）: [列举]
  - 结论: ✅ / ⚠️
  ```

#### Task 10: 文档更新

**Files:**
- 修改: `README.md`

- [ ] **Step 1: 撰写 README**

  包含: 项目定位、快速开始（安装/配置/启动）、API 概览、CLI 命令、架构图

- [ ] **Step 2: 提交**
