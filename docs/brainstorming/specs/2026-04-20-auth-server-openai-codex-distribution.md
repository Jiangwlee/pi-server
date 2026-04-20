# auth-server：扩展 OpenAI Codex OAuth 凭证分发

> 让 auth-server 作为 "Pi auth.json pass-through 层"，把所有 Pi CLI 已登录的 OAuth provider（含 openai-codex）完整透传给下游消费者；顺带修复 pi-server ↔ auth-server 同步链路 pre-existing 的 URL / shape 不一致 bug。

## 目录

- [设计方案](#设计方案)
- [假设与风险登记](#假设与风险登记)
- [Spike 计划](#spike-计划)
- [Spike 结果](#spike-结果)
- [行动原则](#行动原则)
- [行动计划](#行动计划)

---

## 设计方案

### 背景与目标

**痛点**：auth-server 当前只识别 `~/.pi/agent/auth.json` 里的 `github-copilot` 一条 OAuth 凭证，且只取 `refresh` 字段当扁平 `key`。新增 OAuth provider 必须逐个改代码；codex 因其 accountId 等 provider-specific 字段无法通过当前契约流动，导致 pi-server / mindora-ui 即便读到凭证也缺字段。同时 `pi-provider.syncFromProxy` 与 auth-server 的 URL (`/auth.json` vs `/auth`) 和响应 shape (原生 auth.json vs `{credentials, models}`) 均不匹配，auth-proxy 模式实际不可用。

**成功标准**：

1. auth-server 响应中 `credentials` 段能透传 Pi auth.json 里所有 `type: 'oauth'` 条目（含 openai-codex）的完整字段。
2. pi-server 在 auth-proxy 模式下启动后，`GET /api/models` 能列出 github-copilot + openai-codex 的内置模型，前端 ModelSelector 可选中 codex 模型并完成一次 prompt round-trip。
3. pi-server 冒烟测试 + 单测全绿。

### 架构

改动集中在 **pi-server 三个模块 + 一个 compose 配置 + 文档**：

```
packages/server/src/auth/auth-config.ts     ← 扩展读 oauth providers + 重构 Credential 契约
packages/server/src/runtime/pi-provider.ts  ← URL 修正 /auth + reshape 成 Pi auth.json 原生 shape
packages/server/tests/auth-config.test.ts   ← 扩展用例
packages/server/tests/pi-provider.test.ts   ← 更新 mock 契约 + 新增 codex reshape 用例
docker-compose.yml                           ← healthcheck URL /auth.json → /auth
README.md / CLAUDE.md                        ← auth-config.yaml 说明 + codex 部署示例
```

数据流向：

```
~/.pi/agent/auth.json              (Pi CLI 管理：user 登录 github/codex 后写入)
  + ~/.pi-server/auth-config.yaml  (user 维护：api_key 类 providers + models 白名单)
        │
        ▼
  readAuthConfig()       ← 合并：YAML base + Pi auth.json 里所有 type:'oauth' 条目 shallow pass-through
        │
        ▼
  auth-server GET /auth  (Bearer 认证，返回 { credentials, models })
        │
        ├──► mindora-ui AuthSyncService（后续由 user 在 mindora-ui 仓库单独适配；本 PR 不负责）
        │
        └──► pi-server PiProvider.syncFromProxy
                │
                ├─ fetch /auth
                ├─ 解 wrap: const native = data.credentials ?? {}
                ├─ JSON.stringify(native) → InMemoryAuthStorageBackend
                └─ authStorage.reload() + modelRegistry.refresh()
```

### 关键决策

- **β shape 的 OAuth 契约**：`OAuthCredential = { type: 'oauth', refresh: string, access?: string, expires?: number, last_update?: string, [k: string]: unknown }`。`refresh` 是所有 Pi SDK OAuth provider 共有必备字段，锁为强类型；`access` / `expires` 可选（copilot 首次登录为 '' / 0）；`accountId` 等 provider-specific 字段通过 index signature 透传。`ApiKeyCredential` 对称加 index signature 兜底。
- **去 `key` 改 `refresh`**（IRON RULE 1：不要兼容性）：原 `AuthOAuthCredential.key` 历史含义就是 refresh token，更名为 `refresh` 消除认知摩擦；mindora-ui 侧适配由 user 后续在 mindora-ui 仓库单独 PR 承接，**本 PR 不留过渡兼容代码**。
- **readAuthConfig 对 OAuth 全条目 shallow pass-through**：不再对 github-copilot 做特判，改为遍历 `~/.pi/agent/auth.json` 所有 `type: 'oauth' && refresh` 条目，`{ ...entry, type: 'oauth', last_update: <now> }` 全字段透传（entry 里的 refresh / access / expires / accountId / 其他字段自然带上）。api_key 类条目忽略（由 auth-config.yaml 管理，避免重复）。
- **pi-provider 消费端解包**：auth-server 输出 `{ credentials, models }` 包装保持不变（mindora-ui 依赖）。pi-provider 拉到数据后**只需解包** `data.credentials`（entries 本来就已经是 `{ type, ...fields }` 原生 shape），直接作为 Pi SDK 原生 auth.json 写入 InMemoryBackend —— 没有字段映射或形状转换，仅 unwrap。
- **URL 统一到 `/auth`**：pi-provider 从 `/auth.json` 改为 `/auth`；`docker-compose.yml` 主 compose 里 **auth-server service**（行 2-26）的 healthcheck 同步改 `/auth.json` → `/auth`（docker-compose.yml:21）。注意：pi-server service 的 healthcheck（docker-compose.yml:63，走 `/auth/me`）与本次改动无关，不动。独立 compose `docker-compose.auth-server.yml` 里 auth-server 的 healthcheck 本来就是 `/auth`，也不动。
- **models 段语义不变**：auth-server 响应里 `models: ModelEntry[]` 依然由 `~/.pi-server/auth-config.yaml` 的 `models` 段定义，给 mindora-ui 消费；pi-server 不读这个字段（pi-server 的 `/api/models` 走 Pi SDK ModelRegistry.getAvailable，自动识别有 credential 的内置 provider）。

---

## 假设与风险登记

| # | 假设/赌注 | 类别 | 错了的代价 | 处理 |
|---|----------|------|-----------|------|
| A1 | Pi SDK `refreshOAuthTokenWithLock('openai-codex')` 仅凭 `refresh` 能刷出完整 credential（access/accountId 由 JWT decode） | 🟢 | 大 | 已读 `node_modules/.../pi-ai/dist/utils/oauth/openai-codex.js:338` + `auth-storage.js:315` 验证 |
| A2 | `InMemoryAuthStorageBackend` + 原生 auth.json shape 能被 `authStorage.reload()` 识别 codex provider | 🟢 | 大 | 已读 `auth-storage.js:191` (`parseStorageData = JSON.parse`) + `model-registry.js:206` (`loadModels` 从内置 providers 枚举后 filter by `hasConfiguredAuth`) |
| A3 | `ModelRegistry.getAvailable()` 对有 codex credential 的 session 自动返回 codex 内置 models（无需 auth-config.yaml models 段声明） | 🟢 | 中（前端选不到模型） | 已读源码：`loadBuiltInModels` 遍历 `getProviders()` → codex 是 Pi SDK 内置 provider；有 credential 即入列 |
| A4 | auth-server `/auth` 响应里 OAuth credential 额外的 provider-specific 字段（accountId 等）经 reshape 后被 Pi SDK 静默忽略，不触发 schema 报错 | 🟢 | 小 | 已读 `parseStorageData` 仅 `JSON.parse`；Pi SDK 仅访问 `cred.type` + 具体字段，未命中字段自然忽略 |
| A5 | mindora-ui 在本 PR 合入后、其自身适配 PR 合入前这段窗口会暂时失效（读 `credential.key` 得 undefined） | 🟢 | 中（运营窗口） | 按 user 安排：接受窗口期，不留过渡兼容 |
| A6 | Pi auth.json 里 `type: 'oauth'` 条目可能缺 `refresh` 字段（如 github-copilot 首次未完成登录时） | 🟢 | 小 | 延续现有实现：无 refresh 的条目跳过，不纳入 credentials |
| A7 | 本地 Pi auth.json 之外的 OAuth provider 类型（如 anthropic、google-gemini-cli）当前未被 user 使用，但 readAuthConfig 改成 "读所有 oauth" 后会意外把它们也发出去，暴露凭证范围扩大 | 🟢 | 小 | 预期行为：auth-server 的定位就是"透传 Pi CLI 已登录的 provider"，范围与 user 的 `pi auth login` 命令对齐；Bearer token 保护已在位 |
| A8 | auth-proxy 模式下，Pi SDK 的 `refreshOAuthTokenWithLock`（auth-storage.js:315）刷新出的新 codex credential 仅写回 pi-server 本地 `InMemoryAuthStorageBackend`；30 秒后下一次 `syncFromProxy` 的 replace-all 语义（pi-provider.ts:73-76）会用 auth-server 源 `~/.pi/agent/auth.json` 的旧状态覆盖掉。源 auth.json 永远停留在上一次 Pi CLI 写入的值，不会收到 pi-server 刷新出的新 access/expires | 🟢 | 小（非本 PR 引入；codex access 短 TTL 下可能触发频繁刷新，但 Pi SDK 每次都能凭 refresh 重建完整 credential，功能不受影响） | 接受既有行为。如果后续运营发现刷新 thrash 造成 OpenAI API 限流或 refresh 请求开销过大，再开 follow-up：让 pi-server 的 sync 在本地有更新过的 credential（expires > remote）时保留本地版本，或把 refresh 写回 auth-server 源 |

**无 🔴 风险** → Spike 计划 / Spike 结果 两节不适用。

---

## Spike 计划

N/A（无 🔴 风险，跳过）。

---

## Spike 结果

N/A（无 🔴 风险，跳过）。

---

## 行动原则

- **TDD（Test-Driven Development）**：每个 Task 先写失败测试 → 跑失败 → 实现 → 跑成功。**禁止：** 先写实现再补测试；或只写 happy path 不覆盖 edge case。
- **Break, Don't Bend**：字段命名重构从 `key` 到 `refresh` 一步到位，不留兼容 shim、不保留别名。**禁止：** 添加 `key` deprecated 字段、添加读 `key` fallback 读 `refresh` 的分支；也禁止在任何一处残留 `key: refresh` 的 shallow mapping。
- **Zero-Context Entry**：所有任务描述须包含具体文件路径 + 函数签名 + 关键逻辑要点，任何 engineer 拿到任务无需回读上下文即可开工。**禁止：** "按上文"、"同前"、"参考 xxx 章节" 类指令。
- **跨仓库守门** `[任务专属]`：本 PR 不留任何为了兼容 mindora-ui 旧版 `{ key }` 契约的代码路径。**禁止：** 在 auth-config.ts / pi-provider.ts 保留双字段、或添加任何 `// TODO: remove once mindora-ui updates` 类注释。

---

## 行动计划

### 文件结构设计

| 操作 | 文件路径 | 职责 |
|------|----------|------|
| 修改 | `packages/server/src/auth/auth-config.ts` | `Credential` 类型重构为 β shape；`readAuthConfig` 改为对 Pi auth.json 所有 `type:'oauth'` 条目 shallow pass-through |
| 修改 | `packages/server/tests/auth-config.test.ts` | 新增 codex + multi-oauth-provider 场景用例，更新 github-copilot 用例为新契约 |
| 修改 | `packages/server/src/runtime/pi-provider.ts` | `syncFromProxy` URL `/auth.json` → `/auth`；解 wrap → reshape `credentials` 到原生 auth.json shape 后写入 InMemoryBackend |
| 修改 | `packages/server/tests/pi-provider.test.ts` | Mock 响应从"原生 auth.json"改为"`{credentials,models}` 包装"；新增 codex reshape 用例 |
| 修改 | `docker-compose.yml` | auth-server service 的 healthcheck URL 从 `/auth.json` 改为 `/auth`（行 21） |
| 修改 | `README.md` | 部署章节的 auth-config.yaml 说明补充 codex 示例 + 澄清"所有 OAuth providers 从 Pi auth.json 自动合并" |
| 修改 | `CLAUDE.md`（若涉及） | Credential 字段描述同步更新 |

---

### 任务步骤

#### Task 1：重构 Credential 类型 + readAuthConfig OAuth pass-through

**Files:**
- 修改: `packages/server/src/auth/auth-config.ts`
- 测试: `packages/server/tests/auth-config.test.ts`

- [ ] **Step 1: 写失败测试** (~5 min)

  新增/改写关键用例：

  ```ts
  // 用例 1：多 OAuth providers 全部 pass-through（含 codex 的 access/expires/accountId）
  it('passes through all oauth providers from Pi auth.json with full fields', () => {
    const dir = makeTmpDir()
    const yamlPath = writeYaml(dir, 'credentials: {}\nmodels: []\n')
    const piPath = writePiAuth(dir, {
      'github-copilot': { type: 'oauth', refresh: 'ghu_x', access: '', expires: 0 },
      'openai-codex': {
        type: 'oauth',
        refresh: 'rt_x',
        access: 'eyJ...',
        expires: 1777471561879,
        accountId: '1e6cf163-...',
      },
    })
    const config = readAuthConfig(yamlPath, piPath)

    expect(config.credentials['github-copilot']).toMatchObject({
      type: 'oauth', refresh: 'ghu_x', access: '', expires: 0,
    })
    expect(config.credentials['openai-codex']).toMatchObject({
      type: 'oauth',
      refresh: 'rt_x',
      access: 'eyJ...',
      expires: 1777471561879,
      accountId: '1e6cf163-...',
    })
  })

  // 用例 2：oauth 条目无 refresh 被跳过
  it('skips oauth entries without refresh field', () => {
    const dir = makeTmpDir()
    const yamlPath = join(dir, 'no.yaml')
    const piPath = writePiAuth(dir, {
      'github-copilot': { type: 'oauth', access: 'x', expires: 0 },
    })
    expect(readAuthConfig(yamlPath, piPath).credentials['github-copilot']).toBeUndefined()
  })

  // 用例 3：Pi oauth 覆盖 YAML 同名 provider（保持现有语义）
  it('pi auth.json oauth entry overrides yaml-defined provider with the same name', () => {
    const dir = makeTmpDir()
    const yamlPath = writeYaml(
      dir,
      [
        'credentials:',
        '  github-copilot:',
        '    type: oauth',
        '    refresh: stale_from_yaml',
        'models: []',
        '',
      ].join('\n'),
    )
    const piPath = writePiAuth(dir, {
      'github-copilot': { type: 'oauth', refresh: 'fresh_from_pi', access: 'a', expires: 0 },
    })
    const config = readAuthConfig(yamlPath, piPath)

    expect(config.credentials['github-copilot']).toMatchObject({
      type: 'oauth',
      refresh: 'fresh_from_pi',
      access: 'a',
    })
  })

  // 用例 4：YAML 中 api_key credential shape 不变（index signature 不影响既有 api_key 用例）
  it('preserves api_key credentials from yaml untouched', () => {
    const dir = makeTmpDir()
    const yamlPath = writeYaml(
      dir,
      [
        'credentials:',
        '  kimi-coding:',
        '    type: api_key',
        '    key: sk-kimi',
        '    baseUrl: https://api.moonshot.cn/v1',
        'models: []',
        '',
      ].join('\n'),
    )
    const piPath = writePiAuth(dir, {})
    const config = readAuthConfig(yamlPath, piPath)

    expect(config.credentials['kimi-coding']).toMatchObject({
      type: 'api_key',
      key: 'sk-kimi',
      baseUrl: 'https://api.moonshot.cn/v1',
    })
    // 断言 api_key 不被当作 oauth 误加字段
    expect((config.credentials['kimi-coding'] as Record<string, unknown>).refresh).toBeUndefined()
  })
  ```

  同时**修改既有 github-copilot 相关用例**：断言字段 `key` → `refresh`。

- [ ] **Step 2: 运行测试确认失败** (~1 min)

  ```bash
  pnpm --filter @pi-server/server test -- auth-config
  # 预期：新用例 FAIL，老用例因字段改名也 FAIL
  ```

- [ ] **Step 3: 实现** (~10 min)

  重构 `packages/server/src/auth/auth-config.ts`：

  ```ts
  // 类型契约（β shape）
  export interface OAuthCredential {
    type: 'oauth'
    refresh: string
    access?: string
    expires?: number
    last_update?: string
    [k: string]: unknown   // provider-specific: accountId 等
  }

  export interface ApiKeyCredential {
    type: 'api_key'
    key: string
    baseUrl?: string
    last_update?: string
    [k: string]: unknown
  }

  export type Credential = OAuthCredential | ApiKeyCredential
  ```

  重构 readAuthConfig 的 Pi auth.json 合并逻辑：
  - 函数签名保持 `readAuthConfig(configPath?, piAuthPath?): AuthConfig`。
  - 新增 `readPiOAuthCredentials(path): Record<string, OAuthCredential>`：
    - 读 `~/.pi/agent/auth.json`；
    - 遍历所有 entries；
    - 对每条 `entry.type === 'oauth' && typeof entry.refresh === 'string' && entry.refresh.length > 0` 的条目，收集为 `{ ...entry, type: 'oauth', last_update: new Date().toISOString() }`（shallow spread 保留 access/expires/accountId 等）；
    - 其他条目跳过。
  - 在 `readAuthConfig` 合并阶段：`for (const [provider, cred] of Object.entries(piOauth)) { base.credentials[provider] = cred }`（Pi 覆盖 YAML）。
  - 删除 `readPiCopilotCredential`（原写死 github-copilot 那一版）。

  边界情况：
  - Pi auth.json 里 api_key 类型条目：忽略（api_key 由 auth-config.yaml 管，避免重复）。
  - entry 不是 object、或 type 字段缺失：跳过。

- [ ] **Step 4: 运行测试确认通过** (~1 min)

  ```bash
  pnpm --filter @pi-server/server test -- auth-config
  # 预期：全部 PASS
  ```

- [ ] **Step 5: 提交** (~1 min)

  ```bash
  git add packages/server/src/auth/auth-config.ts packages/server/tests/auth-config.test.ts
  git commit -m "refactor(auth): oauth credential β shape + readAuthConfig pass-through all oauth providers"
  ```

---

#### Task 2：pi-provider `/auth` URL + reshape 到原生 auth.json

**Files:**
- 修改: `packages/server/src/runtime/pi-provider.ts`
- 测试: `packages/server/tests/pi-provider.test.ts`

- [ ] **Step 1: 写失败测试** (~5 min)

  改写现有 mock：auth-server 响应 shape 改成 `{ credentials, models }`；新增 reshape 断言。

  ```ts
  it('fetches /auth and reshapes wrapped payload into native auth.json for InMemoryBackend', async () => {
    const wrapped = {
      credentials: {
        'github-copilot': { type: 'oauth', refresh: 'ghu_x', access: '', expires: 0 },
        'openai-codex': {
          type: 'oauth', refresh: 'rt_x', access: 'eyJ...', expires: 1777471561879, accountId: '1e6cf163',
        },
        'kimi-coding': { type: 'api_key', key: 'sk-kimi' },
      },
      models: [
        { id: 'claude-sonnet-4.6', provider: 'github-copilot', name: 'Claude Sonnet 4.6' },
      ],
    }
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200, json: () => Promise.resolve(wrapped),
    })

    const provider = new PiProvider({
      authProxyUrl: 'http://auth-server:3001',
      authProxyToken: 't',
      initialSyncMaxAttempts: 1,
      initialSyncRetryMs: 0,
    })
    await provider.init()

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://auth-server:3001/auth',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer t' }) }),
    )

    // AuthStorage 应能识别 codex
    const storage = provider.getAuthStorage()
    expect(storage.hasAuth('openai-codex')).toBe(true)
    expect(storage.hasAuth('github-copilot')).toBe(true)
    expect(storage.hasAuth('kimi-coding')).toBe(true)

    provider.dispose()
  })
  ```

  同时把旧 "anthropic/openai apiKey" 用例替换为新契约（因为 Pi SDK 期待 `type:'api_key'` 的原生 shape，不是扁平 `{ apiKey }`）。

- [ ] **Step 2: 运行测试确认失败** (~1 min)

  ```bash
  pnpm --filter @pi-server/server test -- pi-provider
  # 预期：新用例因 URL 和 shape 不匹配 FAIL
  ```

- [ ] **Step 3: 实现** (~8 min)

  修改 `syncFromProxy`：

  ```ts
  async syncFromProxy(): Promise<void> {
    if (!this.proxyUrl || !this.backend) return

    const res = await fetch(`${this.proxyUrl}/auth`, {    // /auth.json → /auth
      headers: {
        Authorization: `Bearer ${this.proxyToken}`,
        'User-Agent': 'pi-server',
      },
    })
    if (!res.ok) {
      logger.warn({ proxyUrl: this.proxyUrl, status: res.status }, 'pi_provider.sync_http_error')
      throw new Error(`Auth proxy returned ${res.status}`)
    }

    const wrapped = await res.json()
    // credentials entries 本已是 Pi SDK 原生 auth.json shape（`{ [provider]: { type, ...fields } }`），
    // 只需 unwrap，不做任何字段映射或转换。
    const nativeAuthJson =
      (wrapped && typeof wrapped === 'object' && wrapped.credentials) || {}

    this.backend.withLock(() => ({
      result: undefined,
      next: JSON.stringify(nativeAuthJson, null, 2),
    }))

    this.authStorage.reload()
    this.modelRegistry.refresh()
    logger.debug({ proxyUrl: this.proxyUrl, providers: Object.keys(nativeAuthJson) }, 'pi_provider.sync_succeeded')
  }
  ```

  **边界情况**：
  - `wrapped` 不是 object / 缺 credentials 字段：`nativeAuthJson` 为空 map，不抛错（由 Pi SDK 层面判断可用性）。
  - 保留 `syncFromProxyWithRetry` 重试逻辑不变。

- [ ] **Step 4: 运行测试确认通过** (~1 min)

  ```bash
  pnpm --filter @pi-server/server test -- pi-provider
  # 预期：全部 PASS
  ```

- [ ] **Step 5: 提交** (~1 min)

  ```bash
  git add packages/server/src/runtime/pi-provider.ts packages/server/tests/pi-provider.test.ts
  git commit -m "fix(pi-provider): sync from /auth endpoint and reshape wrapped payload to native auth.json"
  ```

---

#### Task 3：docker-compose healthcheck URL 修正

**Files:**
- 修改: `docker-compose.yml`

- [ ] **Step 1: 定位并修改** (~1 min)

  `docker-compose.yml:21`（位于 **auth-server service** 的 healthcheck 块，service 定义行 2-26）把 `http://127.0.0.1:3001/auth.json` 改为 `http://127.0.0.1:3001/auth`。注意：不要动行 63 的 pi-server healthcheck（走 `/auth/me`，与本次改动无关）。

- [ ] **Step 2: 本地验证 healthcheck 逻辑** (~2 min)

  不启动完整 compose；用 `node -e "fetch('http://127.0.0.1:3001/auth').then(r => ...)"` 的语法合法性确认（命令与 auth-server compose healthcheck 保持一致）。

- [ ] **Step 3: 提交** (~1 min)

  ```bash
  git add docker-compose.yml
  git commit -m "fix(compose): auth-server healthcheck URL /auth.json → /auth"
  ```

---

#### Task 4：冒烟测试 + 完整构建

**Files:**
- 运行: `pnpm test`, `pnpm build`, `scripts/smoke-test.sh`

- [ ] **Step 1: 整包单测** (~2 min)

  ```bash
  pnpm test
  # 预期：workspace 所有 test PASS
  ```

- [ ] **Step 2: 整包构建** (~2 min)

  ```bash
  pnpm build
  # 预期：无 TS 错误，无警告
  ```

- [ ] **Step 3: Docker 冒烟测试**（~5 min）

  前置：确保本机 `~/.pi/agent/auth.json` 里有 codex 条目。

  ```bash
  scripts/smoke-test.sh
  # 预期：auth-server 可启动、pi-server 健康、smoke 的登录+send round-trip 通过
  ```

- [ ] **Step 4: 可选 — E2E 验证 codex 模型可用**（~3 min）

  浏览器打开 frontend (:3100) → ModelSelector 应能看见 `openai-codex` 下的模型（例如 `gpt-5-codex`）→ 选中并发送一条消息 → 返回有效响应。

  如果 frontend 无法验证，在此 task 里明确标注 "未通过浏览器验证，待 user 人工验收"。

---

#### Task 5：完成核查

**目的**：防止虚报 "完成" 而实际有遗漏。

- [ ] **Step 1: 对照 spec 逐 Task 核查**

  打开本文档 "任务步骤" 列表，逐一确认每个 Task 的每个 Step 均已完成。

- [ ] **Step 2: 对照 spec 设计方案验证无偏差**

  重新阅读本文档 "设计方案" 章节，对比已实现内容，确认：
  - `Credential` 类型按 β shape 落地；
  - `readAuthConfig` 改为对 oauth 全条目 pass-through；
  - `pi-provider` URL 改 `/auth` 且 reshape 逻辑到位；
  - 无 `key` 字段残留、无兼容 shim。

- [ ] **Step 3: 向用户汇报**

  ```
  ## 完成核查报告
  - 已完成 Tasks: X / X
  - 未完成 Steps（如有）: [列举]
  - 与 spec 偏差（如有）: [列举]
  - 结论: ✅ 全部完成，无偏差 / ⚠️ 存在问题（见上）
  ```

---

#### Task 6：文档更新

**Files:**
- 修改: `README.md`（auth-config.yaml 示例 + 部署章节）
- 修改: `CLAUDE.md`（若有涉及 credential 结构的描述）

- [ ] **Step 1: 识别需要更新的文档位置** (~2 min)
  - `README.md:237-253`（auth-config.yaml 示例）
  - `README.md:305-307`（auth-server 模式说明）
  - `CLAUDE.md` 架构章节（如涉及 Credential 字段）

- [ ] **Step 2: 更新内容** (~5 min)
  - 示例 auth-config.yaml 里加一段说明："Pi auth.json 中所有 `type:'oauth'` 的 providers（含 github-copilot, openai-codex, anthropic 等）都会被自动合并到 `credentials` 字段。用户无需在 auth-config.yaml 中声明 oauth providers"。
  - 添加 codex 用于 models 列表的示例条目（供 mindora-ui 下游使用）：
    ```yaml
    models:
      - id: gpt-5-codex
        provider: openai-codex
        name: GPT-5 Codex
    ```
  - 更新 "auth-server 模式" 段落："/auth 端点"正式成为契约（移除历史 `/auth.json` 引用）。

- [ ] **Step 3: 提交** (~1 min)

  ```bash
  git add README.md CLAUDE.md
  git commit -m "docs: auth-config.yaml codex example + /auth endpoint canonical"
  ```
