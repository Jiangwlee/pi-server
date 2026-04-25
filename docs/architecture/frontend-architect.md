# 前端架构（@pi-server/ui）

`@pi-server/ui` 采用三层架构（Transport | State | Render），通过目录结构体现分层约束和单向依赖。

## 三层定义

| 层 | 目录 | 职责 | 不做什么 |
|----|------|------|---------|
| **Transport** | `client/` | SSE 连接/重连/帧解析、REST API 调用、协议类型定义 | 不做业务状态管理 |
| **State** | `state/` | 事件聚合（AgentEvent -> messages + toolExecutions）、Turn 分组、工具状态解析 | 不做 UI 渲染、不做网络请求 |
| **Render** | `components/` | React 组件、工具渲染器注册表、视觉呈现 | 不做事件解析、不直接持有业务状态 |

## 目录映射

```
src/
├── client/                        # Transport
│   ├── api-client.ts
│   ├── sse-client.ts
│   ├── types.ts                   # 共享协议类型（ChatMessage, AgentEvent, ToolRenderState 等）
│   └── index.ts
├── state/                         # State
│   ├── use-chat.ts                # 事件聚合 hook
│   ├── group-messages.ts          # Turn 分组纯函数
│   ├── resolve-tool-state.ts      # 工具状态解析
│   └── index.ts
├── components/                    # Render
│   ├── chat/
│   │   ├── tools/                 # 工具渲染器注册表 + renderers
│   │   ├── timeline/              # 时间线组件
│   │   ├── markdown/              # Markdown 渲染
│   │   └── ...                    # 其余 chat 组件
│   ├── auth/
│   └── session/
├── hooks/                         # 功能域 hook（不属于三层）
│   ├── use-auth.tsx
│   ├── use-auto-scroll.ts
│   ├── use-file-upload.ts
│   ├── use-models.ts
│   └── use-sessions.ts
└── index.ts                       # 公共 API re-export
```

## 依赖方向

```
Transport <- State <- Render
```

- State 可 import Transport 的类型（如 `client/types.ts` 中的 AgentEvent, ChatMessage）
- Render 可 import State 的产出（如 useChat, GroupedTurn, resolveToolState）
- Transport 不 import State 或 Render
- State 不 import Render

## 关键类型流向

共享协议类型（`ChatMessage`, `AgentEvent`, `ToolRenderState` 等）定义在 Transport 层（`client/types.ts`），各层通过 import 引用。State 层消费这些类型进行聚合和转换，Render 层通过 State 层的产出间接使用。

## hooks/ 的定位

`hooks/` 目录存放不属于三层架构的功能域 hook（认证、模型选择、session 管理、自动滚动、文件上传）。这些 hook 是独立的功能模块，不参与 Transport -> State -> Render 的数据流。

## 演进原则

- 如果某层复杂度增长，做层内子模块拆分（如 `state/aggregation/`、`state/grouping/`）
- 不增加一级层数，保持三层架构稳定
- 按职责分层，不按技术类型分层：hook 和纯函数可以同属一层
