# 前端架构分层重构

> 将 `@pi-server/ui` 的隐式五层适配模型重构为显式三层架构（Transport | State | Render），通过目录结构体现分层约束，作为后期开发的稳定基础。

## 目录

- [设计方案](#设计方案)
  - [背景与目标](#背景与目标)
  - [三层定义与职责](#三层定义与职责)
  - [目标目录结构](#目标目录结构)
  - [关键决策](#关键决策)
- [行动原则](#行动原则)
- [行动计划](#行动计划)
  - [文件结构设计](#文件结构设计)
  - [任务步骤](#任务步骤)

---

## 设计方案

### 背景与目标

`@pi-server/ui` 在迭代中自然形成了五层适配模型（SSE 解析 → 状态聚合 → Turn 分组 → 状态解析 → 渲染分发），但从未做过分层设计。State 逻辑散落在 `hooks/`、`components/chat/`、`tools/` 三个目录中，缺乏物理约束——后续开发容易把代码放错层。

**目标**：将五层合并为三层，通过目录结构体现分层，建立清晰的职责边界和单向依赖。

**成功标准**：
1. 三层在目录上完全对称（`client/` | `state/` | `components/`）
2. 依赖方向单向：Transport ← State ← Render
3. 所有测试通过，构建无错误，`@pi-server/frontend` 无需改动

### 三层定义与职责

| 层 | 目录 | 职责 | 不做什么 |
|----|------|------|---------|
| **Transport** | `client/` | SSE 连接/重连/帧解析、REST API 调用、协议类型定义 | 不做业务状态管理 |
| **State** | `state/` | 事件聚合（AgentEvent → messages + toolExecutions）、Turn 分组、工具状态解析 | 不做 UI 渲染、不做网络请求 |
| **Render** | `components/` | React 组件、工具渲染器注册表、视觉呈现 | 不做事件解析、不直接持有业务状态 |

**依赖方向**（单向）：

```
Transport ← State ← Render
```

- State import Transport 的类型（AgentEvent, ChatMessage, ToolExecution）
- Render import State 的产出（GroupedTurn, ToolRenderState, useChat hook）
- Transport 不 import State 或 Render
- State 不 import Render

**`hooks/` 的定位**：保留为"不属于任何层的功能域 hook"（use-auth, use-models, use-sessions, use-auto-scroll, use-file-upload），不是三层架构的一部分。

**未来演进**：如果某层复杂度增长，做层内子模块拆分，不增加一级层数。

### 目标目录结构

```
src/
├── client/                          # Transport — 不动
│   ├── api-client.ts
│   ├── sse-client.ts
│   ├── types.ts
│   └── index.ts
│
├── state/                           # State — 新建
│   ├── use-chat.ts                  ← hooks/use-chat.ts
│   ├── group-messages.ts            ← components/chat/groupMessages.ts
│   ├── resolve-tool-state.ts        ← 从 tools/index.ts 提取
│   └── index.ts                     新建，re-export 公共 API
│
├── hooks/                           # 功能域 hook — 去掉 use-chat
│   ├── use-auth.tsx
│   ├── use-auto-scroll.ts
│   ├── use-file-upload.ts
│   ├── use-models.ts
│   ├── use-sessions.ts
│   └── index.ts
│
├── components/                      # Render
│   ├── chat/
│   │   ├── tools/                   ← src/tools/ 整体移入
│   │   │   ├── types.ts
│   │   │   ├── registry.ts
│   │   │   ├── index.ts
│   │   │   └── renderers/
│   │   │       ├── DefaultRenderer.tsx
│   │   │       └── ToolHeader.tsx
│   │   ├── timeline/                不动
│   │   ├── markdown/                不动
│   │   └── ...
│   ├── auth/                        不动
│   └── session/                     不动
│
└── index.ts                         更新 re-export
```

### 关键决策

- **按职责分层，不按技术类型分层**：hook（use-chat.ts）和纯函数（group-messages.ts）同属 State 层，因为它们服务同一个职责。纯函数已可独立 import 和测试，不需物理隔离。
- **tools/ 归入 components/chat/**：工具渲染器是 chat 渲染的一部分，不应作为独立顶级目录。归入后三层在目录上完全对称。
- **只移动不改逻辑**：本次重构只改文件位置和 import 路径，不修改业务逻辑、函数签名或组件 props。
- **re-export 保持公共 API 不变**：`src/index.ts` 对外暴露的 API 不变，`@pi-server/frontend` 无需改代码。

---

## 行动原则

- **Break, Don't Bend**：直接重构目录结构，不建 re-export 兼容层。**禁止：** 在旧位置保留 re-export 文件指向新位置。
- **Zero-Context Entry**：`state/index.ts` 文件头说明本层职责和边界。**禁止：** 文件无头部说明。
- **Minimum Blast Radius**：只移动文件和更新 import，不捆绑逻辑修改。**禁止：** 顺手重构函数实现或改变接口。
- **目录即约束** `[任务专属]`：分层通过目录物理隔离来强制执行，不依赖文档约束。**禁止：** 跨层 import 违反依赖方向。

---

## 行动计划

### 文件结构设计

| 操作 | 文件路径 | 职责 |
|------|----------|------|
| 新增 | `src/state/index.ts` | State 层公共 API re-export |
| 新增 | `src/state/resolve-tool-state.ts` | 从 tools/index.ts 提取 resolveToolState() |
| 移动 | `src/hooks/use-chat.ts` → `src/state/use-chat.ts` | 事件聚合 hook |
| 移动 | `src/components/chat/groupMessages.ts` → `src/state/group-messages.ts` | Turn 分组纯函数 |
| 移动 | `src/tools/` → `src/components/chat/tools/` | 工具渲染器注册表 |
| 修改 | `src/components/chat/tools/index.ts` | 移除 resolveToolState，保留 renderTool |
| 修改 | `src/hooks/index.ts` | 移除 use-chat re-export |
| 修改 | `src/components/chat/index.ts` | 移除 groupMessages re-export |
| 修改 | `src/index.ts` | 更新 re-export 路径 |
| 修改 | 13 个文件 | 更新 import 路径（见 Task 3 清单） |
| 新增 | `docs/architect/frontend-architect.md` | 正式前端架构文档 |
| 修改 | `CLAUDE.md` | 补充前端三层架构概述 |
| 修改 | `docs/brainstorming/specs/packet-vs-message-analysis.md` §5 | 标注五层模型已废弃 |

### 任务步骤

#### Task 1: 创建 State 层，移动文件

**Files:**
- 移动: `src/hooks/use-chat.ts` → `src/state/use-chat.ts`
- 移动: `src/components/chat/groupMessages.ts` → `src/state/group-messages.ts`
- 新增: `src/state/resolve-tool-state.ts`
- 新增: `src/state/index.ts`

- [ ] **Step 1: 创建 `src/state/` 目录** (~1 min)

- [ ] **Step 2: 移动 use-chat.ts** (~1 min)

  ```bash
  git mv src/hooks/use-chat.ts src/state/use-chat.ts
  ```

- [ ] **Step 3: 移动 groupMessages.ts（重命名为 kebab-case）** (~1 min)

  ```bash
  git mv src/components/chat/groupMessages.ts src/state/group-messages.ts
  ```

- [ ] **Step 4: 提取 resolveToolState()** (~2 min)

  从 `src/tools/index.ts` 提取 `resolveToolState()` 函数到 `src/state/resolve-tool-state.ts`。
  - 函数签名: `resolveToolState(result: ChatMessage | undefined, streaming: boolean | undefined): ToolRenderState`
  - 同时 export `ToolRenderState` type（从 tools/types.ts re-export）

- [ ] **Step 5: 创建 state/index.ts** (~2 min)

  Re-export 公共 API：
  - `useChat` + 相关类型（from `./use-chat.js`）
  - `groupMessagesIntoTurns` + `GroupedTurn`/`AgentTurn`/`UserTurn`/`ToolStep` 类型（from `./group-messages.js`）
  - `resolveToolState` + `ToolRenderState` 类型（from `./resolve-tool-state.js`）

#### Task 2: 移动 tools/ 到 components/chat/tools/

**Files:**
- 移动: `src/tools/` → `src/components/chat/tools/`
- 修改: `src/components/chat/tools/index.ts`

- [ ] **Step 1: 移动目录** (~1 min)

  ```bash
  git mv src/tools src/components/chat/tools
  ```

- [ ] **Step 2: 更新 tools/index.ts** (~2 min)

  移除 `resolveToolState()` 函数定义（已在 state 层）。`renderTool()` 内部改为从 `../../../state/resolve-tool-state.js` 导入 `resolveToolState`。

#### Task 3: 更新所有 import 路径

**Files:** 11 个文件

- [ ] **Step 1: 更新 State 消费方 import** (~3 min)

  | 文件 | 旧 import | 新 import |
  |------|-----------|-----------|
  | `components/chat/ChatPanel.tsx` | `../../hooks/use-chat` | `../../state/use-chat` |
  | `components/chat/MessageList.tsx` | `./groupMessages` | `../../state/group-messages` |
  | `components/chat/AgentTurnView.tsx` | `./groupMessages` | `../../state/group-messages` |
  | `components/chat/timeline/ToolTimeline.tsx` | `../groupMessages` | `../../../state/group-messages` |
  | `components/chat/timeline/ToolTimeline.tsx` | `../../../tools/index` (resolveToolState) | `../../../state/resolve-tool-state` |

- [ ] **Step 2: 更新 Render 层内部 import** (~2 min)

  | 文件 | 旧 import | 新 import |
  |------|-----------|-----------|
  | `components/chat/ToolCallBlock.tsx` | `../../tools/index` | `./tools/index` |
  | `components/chat/timeline/TimelineStep.tsx` | `../../../tools/types` | `../tools/types` |
  | `components/chat/timeline/TimelineRail.tsx` | `../../../tools/types` + `../../../tools/index` | `../tools/types` + `../tools/index` |

- [ ] **Step 3: 更新 re-export 文件** (~2 min)

  | 文件 | 变更 |
  |------|------|
  | `hooks/index.ts` | 移除 `export * from './use-chat.js'` |
  | `components/chat/index.ts` | 移除 `export * from './groupMessages.js'` |
  | `src/index.ts` | `./tools/index` → `./components/chat/tools/index`；添加 `export * from './state/index.js'` |

- [ ] **Step 4: 更新测试文件 import（3 个文件）** (~2 min)

  | 文件 | 旧 import | 新 import |
  |------|-----------|-----------|
  | `tests/hooks/use-chat.test.tsx` | `../../src/hooks/use-chat` | `../../src/state/use-chat` |
  | `tests/components/chat/groupMessages.test.ts` | `../../../src/components/chat/groupMessages` | `../../../src/state/group-messages` |
  | `tests/tools/resolveToolState.test.ts` | `../../src/tools/index` | `../../src/state/resolve-tool-state` |

#### Task 4: 验证

- [ ] **Step 1: 运行测试** (~1 min)

  ```bash
  pnpm test
  ```

- [ ] **Step 2: 运行构建** (~1 min)

  ```bash
  pnpm build
  ```

- [ ] **Step 3: 确认依赖方向** (~1 min)

  grep 检查无违规跨层 import：
  - `state/` 中不 import `components/`
  - `client/` 中不 import `state/` 或 `components/`

#### Task 5: 完成核查

- [ ] **Step 1: 对照 spec 逐 Task 核查**

  逐一确认 Task 1-4 每个 Step 已完成。

- [ ] **Step 2: 对照设计方案验证无偏差**

  确认：
  - 目录结构与设计一致
  - 三层依赖方向正确
  - 公共 API 未变（src/index.ts 导出不减少）

- [ ] **Step 3: 向用户汇报**

  ```
  ## 完成核查报告
  - 已完成 Tasks: X / X
  - 未完成 Steps（如有）: [列举]
  - 与 spec 偏差（如有）: [列举]
  - 结论: ✅ / ⚠️
  ```

#### Task 6: 文档更新

**Files:**
- 新增: `docs/architect/frontend-architect.md`
- 修改: `CLAUDE.md`
- 修改: `docs/brainstorming/specs/packet-vs-message-analysis.md`

- [ ] **Step 1: 新建 `docs/architect/frontend-architect.md`** (~3 min)

  正式前端架构文档，包含：
  - 三层定义（Transport | State | Render）
  - 各层职责与边界
  - 目录映射
  - 依赖方向
  - 演进原则（层内子模块拆分，不增加一级层数）

- [ ] **Step 2: 更新 `CLAUDE.md` 架构节** (~2 min)

  在现有后端四层模型下方补充前端三层架构概述，指向 `docs/architect/frontend-architect.md`。

- [ ] **Step 3: 更新 `packet-vs-message-analysis.md` §5** (~1 min)

  将五层适配模型标注为"已废弃，重构为三层架构"，指向 `docs/architect/frontend-architect.md`。

- [ ] **Step 4: 提交** (~1 min)

  ```bash
  git add docs/ CLAUDE.md
  git commit -m "docs: add frontend architecture document, update CLAUDE.md"
  ```
