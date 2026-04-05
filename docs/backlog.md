# Backlog

## 模型选择器升级

**优先级**: 中
**状态**: 待定
**依赖**: 后端 Model 类型扩展

### 现状

当前 `ModelSelector` 是原生 `<select>` 下拉框，仅显示 `provider / name`。

### 目标

参考 pi-webui (`pi-mono/packages/web-ui/src/dialogs/ModelSelector.ts`) 的实现，升级为弹出面板式选择器。

### Gap 分析 (2026-04-05)

| 功能 | pi-webui | pi-server | 备注 |
|------|----------|-----------|------|
| 模糊搜索 | subsequence 算法 + 排序 | ❌ | 纯前端 |
| 能力过滤 | Thinking / Vision toggle | ❌ | 需后端扩展 Model |
| 模型元信息 | 上下文窗口、max tokens、费用 | ❌ | 需后端扩展 Model |
| 能力图标 | 🧠推理 🖼视觉，不支持时半透明 | ❌ | 需后端扩展 Model |
| 当前选中标记 | ✓ + 排序置顶 | ❌ | 纯前端 |
| Provider badge | outline 样式标签 | ❌ | 纯前端 |
| 键盘导航 | ↑↓/Enter/Escape + 自动滚动 | ❌ | 纯前端 |
| 鼠标/键盘模式切换 | 防止 hover 干扰键盘导航 | ❌ | 纯前端 |
| 弹出面板 | 独立 dialog | 原生 select | 纯前端 |

### 实施路径

**Phase 1 — 后端 Model 扩展**
- 从 pi SDK `ModelRegistry` 提取更多字段: `contextWindow`, `maxTokens`, `cost`, `reasoning`, `input` (支持的输入类型)
- 扩展 `/api/models` 响应和 `ui/client/types.ts` 的 `Model` 类型

**Phase 2 — 前端组件重写**
- 弹出面板 (Popover/Dialog) 替代原生 select
- 搜索输入框 + subsequence 模糊匹配
- Thinking / Vision 过滤 toggle
- 模型列表项: id + provider badge + 能力图标 + 费用 + context window
- 当前选中高亮 + 置顶
- 键盘导航 (↑↓ Enter Escape)
- 鼠标/键盘模式自动切换

### 参考

- pi-webui 实现: `pi-mono/packages/web-ui/src/dialogs/ModelSelector.ts`
- pi-webui 模糊搜索: `subsequenceScore()` 函数
- pi-webui 费用格式化: `formatModelCost()` in `utils/format.ts`

---

## pi-webui 对比完整 Gap 清单 (2026-04-05)

以下为与 pi-webui 对比后识别的所有 gap，按优先级排序。

### 大 Gap

| 功能 | 说明 | 工作量 |
|------|------|--------|
| Artifacts 系统 | 9 种 artifact 类型 + sandbox iframe 执行 + 预览/代码切换 | 大 |
| 文档类文件处理 | PDF/DOCX/XLSX/PPTX 文本提取 + 预览 | 大 |
| Thinking Level 选择器 | Off/Minimal/Low/Medium/High 5 级 | 小 |
| 自定义 Provider 管理 | Ollama/vLLM 等自发现 (pi-server 架构可能不需要) | N/A |
| Tool 渲染器注册表 | 可插拔渲染 + 状态指示 (inprogress/complete/error) | 中 |

### 中 Gap

| 功能 | 说明 | 工作量 |
|------|------|--------|
| 模型选择器升级 | 见上方详细分析 | 中 |
| 附件全屏查看 | 图片缩放 + PDF 多页 + 文档预览 | 中 |
| 拖拽 + 剪贴板粘贴上传 | drag-and-drop + paste image | 小 |
| Session 元数据丰富 | 消息数、token 用量、费用汇总、预览文本 | 中 |
| 费用追踪汇总 UI | session 级别费用统计 + 可点击详情 | 小 |
| i18n 国际化 | 多语言翻译 key 体系 | 中 |
| 设置面板 | 多 tab 设置对话框 | 中 |
| Console/输出块 | 颜色区分 + 复制按钮 + 自动滚动 | 小 |

### 小 Gap

| 功能 | 说明 | 工作量 |
|------|------|--------|
| Escape 终止 streaming | 输入框按 Escape 中止 | 极小 |
| 代码块复制按钮 | 复制 + "Copied!" 反馈 | 小 |
| Dark/Light 主题切换 UI | 有 CSS 变量但无切换按钮 | 极小 |
| 图标库 | Lucide 等图标替代文字/emoji | 小 |
