# pi-server

## IRON RULES

1. 不要兼容性：正确的设计 > 兼容性。
2. 修复后必须运行相关测试或命令验证，未验证不能说"fixed"或"已修复"。
3. 用户要求讨论、分析、brainstorming 时，不要改代码。等用户明确要求实现后再动手。

## 架构（Monorepo + 四层模型）

```
HTTP Layer (Hono + @hono/node-server)
  ├── Auth Layer
  │     Public:  POST /auth/login, GET /auth/github, GET /auth/github/callback
  │     Protected: POST /auth/change-password, GET /auth/me, POST /auth/logout
  │     统一 signed cookie (pi_session) → userId
  ├── Binding Layer (SQLite via better-sqlite3)
  │     users 表 + sessions 表 (soft delete)
  │     userId ↔ { sessionDir(相对), cwd(相对), label }
  ├── Runtime Layer (SessionRegistry)
  │     On-demand: 收到消息 → createAgentSession → prompt → SSE 广播 → dispose
  │     串行保护 (409) / 并发限制 (429) / 超时 15min
  │     环形缓冲 (200 条) + Last-Event-ID 断线重连
  └── Pi SDK Layer
        AuthStorage + ModelRegistry + createAgentSession + createCodingTools
        三种模式: standalone / auth-server / auth-proxy
```

## 项目结构

```
packages/
├── server/                  # @pi-server/server
│   ├── src/                 # 后端源码
│   ├── tests/               # vitest
│   └── docker/              # Dockerfile + entrypoint.sh
├── ui/                      # @pi-server/ui (hooks + components)
└── frontend/                # @pi-server/frontend (Next.js)

scripts/                     # smoke-test.sh (后端 Docker 端到端冒烟测试)
docker-compose.yml           # auth-server + pi-server + frontend
```

## 安装

```bash
corepack enable
pnpm install
```

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `SESSION_SECRET` | 正常模式必填 | - | 签名 cookie 密钥，最小 32 字节 |
| `PORT` | 否 | `3000` | 监听端口 |
| `PI_SERVER_DATA` | 否 | `./data` | 数据目录 (SQLite + 用户文件) |
| `PUBLIC_SERVER_URL` | 否 | `http://localhost:$PORT` | 生成 GitHub OAuth callback URL |
| `FRONTEND_URL` | 否 | `http://localhost:3100` | GitHub OAuth 成功后跳转地址 |
| `GITHUB_CLIENT_ID` | 否 | - | GitHub OAuth |
| `GITHUB_CLIENT_SECRET` | 否 | - | GitHub OAuth |
| `AUTH_SERVER_TOKEN` | auth-server 必填 | - | Bearer token |
| `LOG_LEVEL` | 否 | `info` | `debug`/`info`/`warn`/`error` |
| `LOG_FORMAT` | 否 | `json` | `json`/`plain` |
| `SSE_RING_BUFFER_SIZE` | 否 | `200` | SSE 环形缓冲大小 |
| `MAX_CONCURRENT_SESSIONS_PER_USER` | 否 | `3` | 每用户并发 session 上限 |

CLI 参数: `--auth-server` / `--auth-proxy-url <url>` / `--auth-proxy-token <token>`

## 开发流程

```
BrainStorm → Plan → Code → Review → Test → Commit
```

- 设计文档: `docs/brainstorming/specs/`
- 测试命令: `pnpm test` (workspace)
- 冒烟测试: `scripts/smoke-test.sh` (Docker 端到端，需要 jq)
- 构建命令: `pnpm build`
- 开发启动: `pnpm dev:server`

## 开发环境管理（scripts/dev.sh）

```bash
scripts/dev.sh dev run        # 前台启动 server + frontend（推荐）
scripts/dev.sh dev start      # 后台启动，日志写 .dev/logs/
scripts/dev.sh dev stop       # 停止后台进程
scripts/dev.sh docker run     # docker compose up（前台）
scripts/dev.sh docker start   # docker compose up -d
scripts/dev.sh docker stop    # docker compose down
scripts/dev.sh docker rebuild # 重建镜像并启动
```

`dev run/start` 自动执行：端口清理 → 环境变量加载 → ui 构建 → 启动 server(:3000) + frontend(:3100)。

**Monorepo 构建依赖链：** `ui → frontend`（frontend 依赖 ui 编译产物）。改了 ui 代码后必须重新 `dev run`，不能只刷新浏览器。脚本已内置此顺序。

**环境变量：** 首次运行自动生成 `.env.dev`（含 SESSION_SECRET），后续可手动编辑。

## 完成标准

提交前必须全部通过：

- [ ] `pnpm test` 通过
- [ ] `pnpm build` 无错误
- [ ] 无硬编码敏感信息

## PR 期望

- **标题**：`feat:` / `fix:` / `docs:` / `refactor:` / `chore:` 前缀
- **范围**：一个 PR 对应一个连贯的工作单元
- **测试**：新功能附带测试，Bug 修复附带复现用例
- **禁止**：调试代码、注释掉的代码块、TODO 遗留

## 技术栈

- **Runtime**: Node.js 22 + TypeScript (ESM)
- **HTTP**: Hono + @hono/node-server
- **Database**: better-sqlite3 (WAL mode)
- **Auth**: bcrypt (密码), arctic (GitHub OAuth), cookie-signature (signed cookie)
- **Pi SDK**: @mariozechner/pi-coding-agent (createAgentSession, AuthStorage, ModelRegistry)
- **Test**: vitest
- **Deploy**: Docker + docker-compose

## 关键设计决策

- **On-demand session**: 不在内存中保持 session，每次 send 时 createAgentSession → prompt → dispose
- **路径安全**: 前端只传相对路径，后端拼接到 `{dataDir}/users/{userId}/` 下并校验无 traversal
- **error 可恢复**: status=error 时允许 re-send，仅 status=running 拒绝 (409)
- **分布式**: 各节点完全独立（用户/DB/session），仅通过 auth-server 共享 LLM 凭证
- **启动容错**: auth-proxy 模式首次同步有界重试（默认 20 次，1s 间隔），应对 Docker 启动时序竞争
