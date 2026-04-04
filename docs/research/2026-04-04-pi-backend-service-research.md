# PI Backend Service 调研报告（2026-04-04）

## 1. 会话背景

本次会话的核心问题是：

- `pi` 是否支持以 backend service 方式提供服务。
- 在明确需求后，围绕“长期运行的多用户后端 agent 代理服务”进行代码级调研，不修改代码。
- 额外澄清：
  - `packages/coding-agent/docs/sdk.md` 是否比 RPC 更适合该目标。
  - 官方 SDK 示例中 `AuthStorage` 与 `SessionManager` 是否支持持久化方案。

用户明确的目标需求：

1. 需要长期运行的后端服务，提供 HTTP 接口，实现 Web 端完整聊天能力，完整暴露 pi coding-agent 的 RPC 能力。
2. 代理层只做透传与会话管理，agent 能力全部复用 pi 本体。
3. 需要多用户支持（pi 本身是多 session，不是多用户）。

---

## 2. 调研范围与对象

调研目标路径（用户指定）：

- `/home/bruce/Github/pi-mono/packages/ai`
- `/home/bruce/Github/pi-mono/packages/agent`
- `/home/bruce/Github/pi-mono/packages/coding-agent`
- `/home/bruce/Github/pi-mono/packages/web-ui`
- `/home/bruce/Github/pi-mono/packages/mom`
- `/home/bruce/Projects/file-agent`（已有简单 backend pi proxy）

调研方式：

- 只读检索与源码阅读（`rg` + `awk`）
- 不改动任何业务代码
- 调研中间结论落盘至 `/tmp/pi-backend-research-2026-04-04.md`

---

## 3. 参考文档与关键代码

### 3.1 coding-agent（RPC / SDK / 会话）

- `packages/coding-agent/README.md`
- `packages/coding-agent/docs/rpc.md`
- `packages/coding-agent/docs/sdk.md`
- `packages/coding-agent/src/modes/rpc/rpc-mode.ts`
- `packages/coding-agent/src/modes/rpc/rpc-types.ts`
- `packages/coding-agent/src/modes/rpc/rpc-client.ts`
- `packages/coding-agent/src/core/agent-session.ts`
- `packages/coding-agent/src/core/session-manager.ts`
- `packages/coding-agent/src/core/auth-storage.ts`
- `packages/coding-agent/src/core/sdk.ts`
- `packages/coding-agent/src/cli/args.ts`
- `packages/coding-agent/src/main.ts`

### 3.2 agent / ai / web-ui / mom

- `packages/agent/src/proxy.ts`
- `packages/agent/src/agent.ts`
- `packages/agent/src/types.ts`
- `packages/agent/README.md`
- `packages/ai/README.md`
- `packages/web-ui/src/components/AgentInterface.ts`
- `packages/web-ui/src/utils/proxy-utils.ts`
- `packages/web-ui/src/storage/types.ts`
- `packages/web-ui/src/storage/stores/sessions-store.ts`
- `packages/web-ui/README.md`
- `packages/web-ui/ARCHITECTURE.md`
- `packages/mom/src/main.ts`
- `packages/mom/src/slack.ts`
- `packages/mom/src/context.ts`
- `packages/mom/README.md`

### 3.3 file-agent（参考实现）

- `/home/bruce/Projects/file-agent/packages/backend/src/index.ts`
- `/home/bruce/Projects/file-agent/packages/backend/src/llm-proxy.ts`
- `/home/bruce/Projects/file-agent/packages/backend/src/app-config.ts`
- `/home/bruce/Projects/file-agent/packages/backend/src/oauth-store.ts`

---

## 4. 调研问题与结果

## 4.1 pi 是否直接支持 HTTP backend service

结论：**不直接支持 `pi serve` 这类 HTTP 服务模式**。

- `pi-coding-agent` 官方服务化入口是 `--mode rpc`，协议为 `stdin/stdout` JSONL，而不是 HTTP：
  - `packages/coding-agent/README.md`
  - `packages/coding-agent/docs/rpc.md`
  - `packages/coding-agent/src/main.ts` 中 `mode === "rpc"` 分支

---

## 4.2 需求可行性（长期运行 + HTTP + 多用户）

结论：**可行，但需要自建 HTTP↔pi 适配层**。

原因：

- `pi-coding-agent` RPC 命令面完整，覆盖 prompt、steer/follow_up、abort、session 管理、model/thinking、bash、fork、export、messages、commands 等。
- RPC 事件流完整，包含 message/tool/turn/agent 生命周期事件。
- 还包含 extension UI 子协议（`extension_ui_request/response`），可承接高级交互。

限制与边界：

- 传输层是 stdio JSONL，不是网络服务。
- 多用户不是内建概念，必须在代理层实现用户域与会话域映射。
- RPC 模式下有部分 TUI 能力降级（文档已列出 unsupported/degraded UI 方法）。

---

## 4.3 packages/web-ui 对后端的要求

结论：`web-ui` 当前以 `Agent` 实例为中心，不是 RPC 客户端。

- `AgentInterface` 依赖 `session: Agent`，并消费 `AgentEvent` 与 `Agent.state`。
- 若要“完整复用 web-ui 聊天体验 + 后端代理”，需要：
  - 在前端做 `Agent` 兼容 adapter（把后端事件映射回 `AgentEvent` 形状），或
  - 改造前端组件直接消费后端协议。

---

## 4.4 packages/agent / packages/ai 的可复用性

- `packages/agent` 提供 `streamProxy`，能把 LLM 流式请求经 HTTP 代理，但层级仅到 `pi-ai` 的 `AssistantMessageEvent`，不等于 coding-agent RPC 全能力透传。
- `packages/ai` 文档明确推荐生产 Web 场景使用后端代理，避免前端暴露 key；且 `Context` 可序列化，适合跨服务持久化。

---

## 4.5 packages/mom 的借鉴点（多用户/长期运行）

`mom` 展示了可复用的服务端模式：

- 按 channel（可类比 user/session）维护独立 runner/state/store。
- 每 channel 串行队列处理，避免并发踩状态。
- 长期运行进程 + 文件持久化（log/context/settings）。

对多用户 HTTP 代理设计有直接参考价值。

---

## 4.6 file-agent 与目标的差距

`file-agent` 已有：

- 长期运行 HTTP 服务（Hono）
- SSE 流式返回

但当前本质是：

- `/api/stream` -> `pi-ai streamSimple` 的 LLM 代理
- 不是 `pi-coding-agent RPC` 网关
- 缺少 session/turn/tool/extension-ui 级控制面
- OAuth 存储与配置当前是全局策略，不是多用户隔离模型

---

## 5. SDK vs RPC：是否“更好”的结论

问题：`packages/coding-agent/docs/sdk.md` 是否是更好的方案？

结论：**对于 Node.js 后端服务，SDK 通常更好；但若要求跨语言或强进程隔离，RPC 更合适。**

依据：

- `sdk.md` 明确写了 SDK 优先场景：同进程、类型安全、直接状态访问、程序化定制。
- `sdk.md` 也明确 RPC 优先场景：跨语言、进程隔离、语言无关客户端。

能力差异总结：

- 底层核心 agent 能力一致（同一套 AgentSession/AgentLoop）。
- SDK 在集成层可直接调用更多内部 API，控制粒度更细。
- RPC 受 `RpcCommand` 协议面约束，但利于隔离与跨语言。

---

## 6. AuthStorage 与 SessionManager 持久化结论

用户给出的代码片段里：

```ts
const authStorage = AuthStorage.create();
const modelRegistry = ModelRegistry.create(authStorage);
const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  authStorage,
  modelRegistry,
});
```

核对结果：

1. `AuthStorage.create()` 是**文件持久化**，默认落盘 `auth.json`（通常在 `~/.pi/agent/auth.json`）。
2. `AuthStorage.inMemory()` 才是不落盘。
3. `SessionManager.inMemory()` 是内存会话，不持久化。
4. `SessionManager.create()` / `open()` / `continueRecent()` 是持久化方案（jsonl 会话文件）。
5. `createAgentSession()` 默认行为本身就是持久化导向：
   - 默认 `authStorage = AuthStorage.create(...)`
   - 默认 `sessionManager = SessionManager.create(...)`

另外，示例里的 `ModelRegistry.create(...)` 与当前代码不一致，当前实现是 `new ModelRegistry(authStorage, modelsPath?)`。

---

## 7. 推荐架构（基于本次调研）

建议采用：**SDK-first + HTTP API + 多租户会话编排**

- 后端同进程持有 `AgentSession`（每 user/session 维护 runtime 对象）。
- HTTP 层做鉴权、路由、会话映射、事件分发（SSE/WS）。
- 协议设计尽量与 RPC command/event 对齐，保持将来兼容 RPC 客户端与工具链。

可选替代：

- 若你优先考虑隔离与跨语言，则采用 RPC-first（spawn `pi --mode rpc`）并在 HTTP 层转发。

---

## 8. 本次调研产物

- 临时调研稿：`/tmp/pi-backend-research-2026-04-04.md`
- 本报告：`/home/bruce/Projects/pi-server/docs/research/2026-04-04-pi-backend-service-research.md`

