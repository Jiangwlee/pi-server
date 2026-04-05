# 文件上传设计方案

> 为 pi-server 聊天界面添加文件上传能力，支持用户在对话中附加图片和文档。

## 目录

- [背景与调研](#背景与调研)
- [设计原则](#设计原则)
- [架构设计](#架构设计)
  - [上传流程](#上传流程)
  - [消息双视图](#消息双视图)
  - [存储模型](#存储模型)
  - [API 设计](#api-设计)
- [文件类型处理策略](#文件类型处理策略)
- [前端渲染策略](#前端渲染策略)
- [安全性](#安全性)
- [实施计划](#实施计划)

---

## 背景与调研

### 调研对象

| 产品/项目 | 文件处理位置 | 存储方式 | 文档处理 |
|-----------|------------|---------|---------|
| **Pi-webui** | 纯客户端 | base64 内联消息 | 客户端 pdfjs/jszip/xlsx 提取文本 |
| **Claude API** | 服务端 | 原生 document content block | PDF 视觉处理（每页转图像） |
| **ChatGPT** | 服务端 | 后端存储 + Code Interpreter | 动态 Python 代码解析 |
| **Gemini** | 服务端 | Files API（48h 临时存储） | 纯文本提取 |
| **LobeChat** | 服务端 | 云存储 + RAG | 分块 → embedding → 向量检索 |
| **lobe-ui** | 无通用上传组件 | N/A | ChatInputArea 仅提供插槽 |

### 关键发现

1. **Pi SDK 原生支持多模态**：`prompt(text, { images: ImageContent[] })` 已支持 text + images 混合发送（源码确认于 `pi-mono/packages/coding-agent/src/core/agent-session.ts:876`）。注意：pi-server 的 `SdkSession` 类型当前只暴露 `prompt(text: string)`，需要扩展以透传 images 参数
2. **Pi-ai 类型系统**：仅支持 `TextContent | ImageContent`，无原生 DocumentContent，文档必须预处理为这两种类型
3. **行业趋势**：有后端的产品普遍采用服务端处理 + URL 引用，客户端处理是无后端架构的妥协
4. **前端渲染**：消息列表显示缩略图/图标，点击后展开详细预览，两层渐进式渲染

---

## 设计原则

1. **后端持久化 + URL 引用**：文件存储在服务端，消息中保存文件引用，不内联 base64
2. **图片优先**：Phase 1 只做图片，PDF/DOCX 等文档类型后续扩展
3. **消息双视图**：用户看到文本 + 缩略图/图标，LLM 收到文本 + ImageContent/TextContent blocks
4. **嵌入内容对用户透明**：文档提取的文本作为 TextContent 发给 LLM，但不显示给用户
5. **两步上传**：选文件时立即上传获得预览，发消息时携带文件引用

---

## 架构设计

### 上传流程

```
用户选择/拖拽/粘贴文件
  │
  ▼
POST /api/files/upload  ──→  后端处理
  │                            ├── 校验（类型、大小、sessionId 所有权）
  │                            ├── 存储原文件到磁盘
  │                            ├── 生成缩略图（sharp, 256px WebP）
  │                            └── 返回 { fileId, thumbnailUrl, mimeType, fileName }
  ▼
前端显示预览（缩略图/图标）
  │  用户可删除不想要的附件
  │
  ▼  用户点击发送
POST /api/sessions/:id/send
  body: { message: "分析这张图", fileIds: ["file-abc123"] }
  │     后端校验：每个 fileId 属于当前 userId，fileIds ≤ 10 个
  │
  ▼  后端组装 LLM 消息
  ├── 图片 → 读取原文件 → 压缩至最长边 2048px → base64 → ImageContent block
  ├── 文档 → 读取 extractedText → TextContent block（Phase 2）
  └── 调用 SDK prompt(text, { images })
```

**孤文件清理**：用户上传文件后可能从未发送消息（关闭页面、刷新等）。`attachments` 表记录 `referenced_at` 字段（首次被 send 引用的时间），定期清理超过 24h 未被引用的孤文件。

### 消息双视图

同一条消息有两种表示：

**用户视图（前端渲染）**：
```json
{
  "role": "user",
  "content": "分析这张图",
  "attachments": [
    {
      "fileId": "file-abc123",
      "fileName": "photo.jpg",
      "mimeType": "image/jpeg",
      "thumbnailUrl": "/api/files/file-abc123/thumbnail"
    }
  ]
}
```

**LLM 视图（发给 SDK）**：
```typescript
prompt("分析这张图", {
  images: [{
    type: "image",
    data: "base64_encoded_full_image...",
    mimeType: "image/jpeg"
  }]
})
```

用户不会看到 base64 数据或提取的文本，只看到自己输入的文字和文件缩略图。

### 存储模型

```
{dataDir}/users/{userId}/
  └── attachments/
        └── {fileId}/
              ├── original.{ext}    # 原始文件
              └── thumbnail.webp    # 缩略图（256px, WebP）
```

**数据库扩展**（`message_attachments` 表或在消息 JSON 中嵌入引用）：

```sql
-- 追加到现有 db.ts 的 MIGRATIONS 字符串（沿用 CREATE TABLE IF NOT EXISTS 模式）
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,              -- 格式: file-{uuid-v4}
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  extracted_text TEXT,               -- 文档提取的文本（Phase 2）
  referenced_at INTEGER,             -- 首次被 send 引用的时间，NULL 表示未引用（孤文件）
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

> **注意**：sessions 表使用 soft delete（`deleted_at` 字段），不会物理删除行。因此附件清理不能依赖 SQL `CASCADE`，必须在应用层实现：session soft delete 时触发关联附件的磁盘文件清理。

### API 设计

所有 `/api/files/*` 路由挂载在与 `/api/sessions/*` 相同的认证路由组下（经过 `authMiddleware`）。

#### 上传文件

```
POST /api/files/upload
Content-Type: multipart/form-data

Request:
  file: <binary>
  sessionId: string

校验:
  1. authMiddleware 提取 userId
  2. sessionStore.findById(sessionId, userId) 校验 session 所有权 → 404 if not match
  3. MIME type + magic bytes 校验（不仅依赖 Content-Type header）
  4. 文件大小 ≤ 20MB（Hono middleware 层限制 body ≤ 25MB，流式解析 multipart）

Response 201:
  {
    "id": "file-abc123",
    "fileName": "photo.jpg",
    "mimeType": "image/jpeg",
    "size": 1048576,
    "thumbnailUrl": "/api/files/file-abc123/thumbnail"
  }

Error:
  400 — 文件类型不支持 / 文件过大
  404 — sessionId 不存在或不属于当前用户
```

#### 获取缩略图

```
GET /api/files/:fileId/thumbnail

校验: attachmentStore.findById(fileId) → row.user_id === userId → 404 if not match

Response: image/webp
Headers: Cache-Control: public, max-age=31536000, immutable
  （fileId 含 UUID，内容不可变，可用激进缓存策略）
```

#### 获取原文件

```
GET /api/files/:fileId/original

校验: 同缩略图接口

Response: 原始 MIME 类型
Headers: Cache-Control: public, max-age=31536000, immutable
```

#### 发送消息（扩展现有接口）

```
POST /api/sessions/:id/send
Content-Type: application/json

Request:
  {
    "message": "分析这张图",
    "fileIds": ["file-abc123"],         // 可选，最多 10 个
    "model": "github-copilot:gpt-5.4-mini"    // 可选
  }

校验:
  1. 每个 fileId 必须存在且 user_id === 当前用户（防止跨用户引用）
  2. fileIds.length ≤ 10
  3. fileId 不存在 → 400 { error: "attachment not found: file-xxx" }

处理:
  1. 标记 referenced_at（首次引用时间）
  2. 图片：读取原文件 → sharp 压缩至最长边 2048px → base64 → ImageContent
  3. 文档：读取 extracted_text → TextContent（Phase 2）
  4. 调用 SDK prompt(text, { images })
```

---

## 文件类型处理策略

### Phase 1：图片

| 步骤 | 处理 |
|------|------|
| 上传 | 校验 MIME（image/jpeg, image/png, image/gif, image/webp） |
| 存储 | 原文件 + 生成 256px WebP 缩略图 |
| 发送给 LLM | 读取原文件 → sharp 压缩至最长边 2048px → base64 → `ImageContent` block |
| 前端显示 | 缩略图 URL 渲染，点击查看原图 |

### Phase 2：文档（未来扩展）

| 步骤 | 处理 |
|------|------|
| 上传 | 校验 MIME（application/pdf, .docx, .xlsx 等） |
| 存储 | 原文件 + 服务端提取文本（pdf-parse, mammoth, xlsx） |
| 发送给 LLM | 提取文本 → `TextContent` block（`[Document: filename]\n...`） |
| 前端显示 | 文档图标 + 文件名，**不显示提取的文本** |

---

## 前端渲染策略

### 消息列表（缩略图层）

- **图片**：`<img src={thumbnailUrl}>`，生成 256px 缩略图（覆盖不同显示密度），CSS 显示尺寸根据上下文调整（消息列表 48-64px，input 预览 32-48px）
- **文档**：图标（FileText / FileSpreadsheet）+ 文件名
- HTTP 缓存：`Cache-Control: public, max-age=31536000, immutable`（fileId 含 UUID，内容不可变）

### 详细预览（点击展开）

- **图片**：加载原图 URL，lightbox 模式
- **PDF**：Phase 2，可选引入 PDF.js 逐页渲染
- **DOCX/Excel**：Phase 2，可选引入 docx-preview / xlsx

### UI 组件

ChatInput 的 `topAddons` 插槽用于显示已上传文件的预览列表（缩略图 + 删除按钮），`bottomAddons` 保持现有的模型选择器 + 发送按钮布局。

---

## 安全性

| 风险 | 防护措施 |
|------|---------|
| 路径穿越 | 文件存储在 `{dataDir}/users/{userId}/attachments/{fileId}/`，fileId 为 `file-{uuid-v4}`，不接受用户自定义路径 |
| 文件类型伪造 | 校验 MIME type + magic bytes（文件头），不仅依赖 Content-Type header 或扩展名 |
| 文件大小 | Hono middleware 层限制 body ≤ 25MB（流式解析 multipart，在读取完整 body 前拒绝过大请求）；业务层限制单文件 ≤ 20MB |
| 未授权访问 | 所有 `/api/files/*` 路由经过 authMiddleware；上传校验 sessionId 所有权；读取校验 `attachmentStore.findById(fileId).user_id === userId` |
| 跨用户文件引用 | send 接口校验每个 fileId 属于当前 userId |
| 单次附件数量 | send 接口限制 fileIds ≤ 10 个 |
| 内存压力 | send 时 sharp 将原图压缩至最长边 2048px 再转 base64，避免 20MB 原图直接编码（~27MB base64） |
| 孤文件堆积 | `referenced_at` 字段追踪引用状态，定期清理超过 24h 未被引用的文件 |
| 存储清理 | session soft delete 时应用层触发关联附件的磁盘文件清理（不依赖 SQL CASCADE） |

---

## 实施计划

### Phase 1：图片上传（MVP）

**后端**：
1. 在 `db.ts` 的 `MIGRATIONS` 字符串中追加 `CREATE TABLE IF NOT EXISTS attachments ...`（沿用现有模式）
2. 实现 `AttachmentStore`（CRUD + 孤文件查询 + 按 session 清理）
3. 添加 Hono body size limit middleware（25MB，流式解析 multipart）
4. 实现文件上传路由（`POST /api/files/upload`）+ sharp 缩略图生成 + 所有权校验
5. 实现文件读取路由（`GET /api/files/:id/thumbnail`、`GET /api/files/:id/original`）+ 所有权校验 + immutable 缓存头
6. 扩展 `POST /api/sessions/:id/send` 支持 `fileIds`（校验所有权、数量限制、标记 referenced_at）
7. 扩展 `SdkSession` 类型：`prompt: (text: string, images?: ImageContent[]) => Promise<void>`
8. 扩展 `SessionRegistry.send` 参数以接收 images 数据
9. SDK 包装器透传 images：`session.prompt(text, { images })`
10. Docker 镜像适配 sharp native 依赖
11. session soft delete 时触发关联附件磁盘清理

**前端（ui 包）**：
1. 创建 `FileUploadButton` 组件（选择文件 + 触发上传）
2. 创建 `AttachmentPreview` 组件（缩略图列表 + 删除）
3. 集成到 ChatInput 的 `topAddons`
4. 扩展 `useChat` hook 管理附件状态
5. MessageList 渲染附件缩略图

**前端（frontend 包）**：
1. 代理上传接口（`/api/files/*` → 后端）。注意：Next.js 代理 multipart 请求需禁用默认 body parser（`export const config = { api: { bodyParser: false } }`）或使用 `rewrites` 直接代理

### Phase 2：文档支持（后续）

- 服务端引入 `pdf-parse`、`mammoth`、`xlsx`
- 上传时提取文本存入 `attachments.extracted_text`
- 发送消息时将提取文本作为 TextContent 附加
- 前端显示文档图标，不显示提取内容
