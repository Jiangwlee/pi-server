 根据源码分析，pi coding agent的RPC消息类型分为以下几类：

 1. Commands (客户端 → stdin)

 Prompting
 - prompt - 发送用户消息
 - steer - 队列引导消息
 - follow_up - 队列后续消息
 - abort - 中止当前操作
 - new_session - 新建会话

 State & Messages
 - get_state - 获取会话状态
 - get_messages - 获取所有消息

 Model
 - set_model - 切换模型
 - cycle_model - 循环可用模型
 - get_available_models - 列出所有模型

 Thinking
 - set_thinking_level - 设置思考级别
 - cycle_thinking_level - 循环思考级别

 Queue Modes
 - set_steering_mode - 设置引导模式 (all | one-at-a-time)
 - set_follow_up_mode - 设置跟进模式 (all | one-at-a-time)

 Compaction
 - compact - 手动压缩上下文
 - set_auto_compaction - 启用/禁用自动压缩

 Retry
 - set_auto_retry - 启用/禁用自动重试
 - abort_retry - 中止重试

 Bash
 - bash - 执行shell命令
 - abort_bash - 中止bash命令

 Session
 - get_session_stats - 获取统计信息
 - export_html - 导出HTML
 - switch_session - 切换会话
 - fork - 从指定消息分叉
 - get_fork_messages - 获取可分叉的消息列表
 - get_last_assistant_text - 获取最后助手的文本
 - set_session_name - 设置会话名称

 Commands
 - get_commands - 获取可用命令列表

 2. Responses (stdout → 客户端)

 每个command都有对应的response，格式为：

 ```json
   { "type": "response", "command": "<name>", "success": true/false, "data": {...}, "error": "..." }
 ```

 3. Events (stdout 流式事件)

 Agent生命周期
 - agent_start - 开始处理
 - agent_end - 完成处理

 Turn生命周期
 - turn_start - 新turn开始
 - turn_end - turn完成

 Message生命周期
 - message_start - 消息开始
 - message_update - 流式更新（包含 assistantMessageEvent delta）
 - message_end - 消息结束

 Tool执行
 - tool_execution_start - 工具开始
 - tool_execution_update - 执行进度
 - tool_execution_end - 工具完成

 自动功能
 - auto_compaction_start/end - 自动压缩
 - auto_retry_start/end - 自动重试

 扩展
 - extension_error - 扩展错误

 4. Extension UI Protocol

 Requests (stdout)
 - Dialog: select, confirm, input, editor
 - Fire-and-forget: notify, setStatus, setWidget, setTitle, set_editor_text

 Responses (stdin)
 - extension_ui_response - 响应UI请求

 完整类型定义在 /home/bruce/Github/pi-mono/packages/coding-agent/src/modes/rpc/rpc-types.ts。