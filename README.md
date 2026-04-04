# pi-server

Multi-user HTTP backend framework for [pi coding-agent](https://github.com/mariozechner/pi).

## Why

[pi](https://github.com/mariozechner/pi) is an open-source AI coding agent that runs as a CLI tool or in-browser. It has no built-in HTTP server mode, no multi-user isolation, and no centralized LLM credential management. Every time you build a web application powered by pi, you have to solve these problems from scratch.

pi-server solves them once:

- **The problem**: You want multiple users to interact with pi through a web UI, each with isolated sessions and workspaces, sharing a single set of LLM API keys — but pi only supports single-user, local-file operation.
- **The solution**: A thin HTTP layer that wraps the pi SDK, adding authentication, per-user session isolation, and server-side credential management. Your frontend just calls REST APIs and listens to SSE events.

## How It Works

```
Frontend (any web app)
    │
    ▼  HTTP + SSE
┌──────────────────────────────────────────────┐
│  pi-server                                    │
│                                               │
│  Auth ──→ Cookie session (userId)             │
│  DB   ──→ SQLite (users + sessions)           │
│  Runtime ─→ On-demand pi SDK sessions         │
│  LLM  ──→ Shared AuthStorage + ModelRegistry  │
└──────────────────────────────────────────────┘
    │
    ▼  SDK calls
  pi coding-agent (createAgentSession, prompt, tools...)
    │
    ▼  API calls
  LLM Providers (Anthropic, OpenAI, GitHub Copilot, ...)
```

**On-demand session model**: pi-server does not keep agent sessions alive in memory. When a user sends a message, the server creates an `AgentSession` via the pi SDK, runs the prompt, streams events via SSE, then disposes the session. Session history is persisted to JSONL files and restored on the next message via `SessionManager.open()`.

## Features

- **Multi-user isolation** — GitHub OAuth + email/password authentication, user-session binding in SQLite
- **Unified LLM credentials** — Server-side shared AuthStorage + ModelRegistry, no per-user API keys needed
- **On-demand session runtime** — Sessions created per-message, not persistent in memory; serial protection (409), per-user concurrency limit (429), 15min timeout
- **SSE streaming** — Real-time event streaming with ring buffer (200 entries) and `Last-Event-ID` reconnection
- **Distributed deployment** — Each node is fully independent (own users, DB, sessions); only LLM credentials are shared via Auth Server mode
- **Path security** — Frontend passes relative paths only; backend resolves under `{dataDir}/users/{userId}/` with traversal prevention
- **Structured logging** — JSON/plain format, log level control, request tracing with `x-request-id`

## Quick Start (Local)

### Prerequisites

- Node.js 22+
- pi coding-agent installed and logged into at least one LLM provider (`~/.pi/agent/auth.json` must exist)

### Install

```bash
npm install
```

### Configure

```bash
cp .env.example .env
# Edit .env — at minimum set SESSION_SECRET (32+ bytes)
```

### Create Users

```bash
# Development (from source)
npx tsx src/cli.ts add-user --email admin@example.com --password secret --login admin
npx tsx src/cli.ts list-users
npx tsx src/cli.ts reset-password --email admin@example.com --password newpass

# Production (after build)
node dist/cli.js add-user --email admin@example.com --password secret --login admin
```

### Start Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

The server reads `~/.pi/agent/auth.json` for LLM credentials. Ensure you have logged in via pi CLI first:

```bash
pi login github-copilot   # or: pi login anthropic, pi login openai, etc.
```

## Deployment

### Deployment Modes

pi-server supports three deployment modes:

| Mode | Flag | Use Case |
|------|------|----------|
| **Standalone** | (default) | Single machine, reads local `~/.pi/agent/auth.json` |
| **Auth Server** | `--auth-server` | Dedicated credential server, exposes `GET /auth.json` with Bearer auth |
| **Auth Proxy** | `--auth-proxy-url` | Application node, pulls credentials from auth server every 30s |

In distributed deployments, each node is fully independent — own users, own database, own sessions. The **only** shared state is LLM provider credentials, synchronized via Auth Server.

### Docker Compose (Recommended)

The included `docker-compose.yml` deploys a two-container setup:

| Container | Role | Port |
|-----------|------|------|
| `pi-auth-server` | Auth Server — serves `~/.pi/agent/auth.json` from host | 3001 |
| `pi-server` | Application server — pulls credentials from auth-server | 3000 |

#### Step 1: Prepare LLM credentials

Ensure `~/.pi/agent/auth.json` exists on the host (mounted read-only into the auth-server container):

```bash
# Login to LLM providers via pi CLI
pi login github-copilot
# Verify
cat ~/.pi/agent/auth.json
```

#### Step 2: Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# Required
SESSION_SECRET=your-secret-at-least-32-bytes-long   # Cookie signing key (min 32 bytes)
AUTH_SERVER_TOKEN=your-shared-bearer-token            # Shared between auth-server and proxy
AUTH_PROXY_TOKEN=your-shared-bearer-token             # Must match AUTH_SERVER_TOKEN

# Initial user (auto-created on first boot)
TEST_USER_EMAIL=admin@example.com
TEST_USER_PASSWORD=your-password
TEST_USER_LOGIN=admin

# Optional
TZ=Asia/Shanghai                                     # Container timezone
PI_HTTP_PROXY=                                       # Set if containers need a proxy for LLM APIs
PI_HTTPS_PROXY=
PI_NO_PROXY=localhost,127.0.0.1,::1
```

#### Step 3: Build and start

```bash
docker compose build
docker compose up -d
```

#### Step 4: Verify

```bash
# Check auth-server is serving credentials
curl -s -H "Authorization: Bearer $AUTH_SERVER_TOKEN" http://localhost:3001/auth.json | head -c 200

# Login with the auto-created user
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password"}'
```

#### Manage

```bash
# View logs
docker compose logs -f pi-server

# User management inside container
docker exec pi-server pi-server list-users
docker exec pi-server pi-server add-user --email new@example.com --password pass --login newuser

# Stop
docker compose down

# Stop and remove data volume
docker compose down -v

# Rebuild after code changes
docker compose build && docker compose up -d
```

### Standalone Mode (No Docker)

For single-machine deployment without credential sharing:

```bash
npm run build

export SESSION_SECRET="your-secret-at-least-32-bytes-long"
export PI_SERVER_DATA="./data"

node dist/cli.js add-user --email admin@example.com --password secret --login admin
node dist/index.js
```

Reads `~/.pi/agent/auth.json` directly.

### Auth Server Mode

Run a dedicated credential server on the machine where `pi login` was performed:

```bash
export AUTH_SERVER_TOKEN="shared-bearer-token"
node dist/index.js --auth-server
# Serves GET /auth.json on PORT (default 3000), protected by Bearer token
```

### Auth Proxy Mode

Connect application nodes to a remote auth server:

```bash
export SESSION_SECRET="your-secret"
node dist/index.js \
  --auth-proxy-url http://auth-host:3001 \
  --auth-proxy-token shared-bearer-token
```

Sync behavior:
- **Startup**: First pull must succeed (fail-closed — process exits if auth server is unreachable)
- **Periodic**: Pulls every 30s; failures retain last-good data without crashing
- **Replace-all**: Remote deletions propagate — if a provider is removed from auth server, it's removed locally

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SESSION_SECRET` | Yes (normal mode) | — | Cookie signing key, min 32 bytes |
| `PORT` | No | `3000` | HTTP listen port |
| `PI_SERVER_DATA` | No | `./data` | Data directory (SQLite DB + user files) |
| `GITHUB_CLIENT_ID` | No | — | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | No | — | GitHub OAuth client secret |
| `AUTH_SERVER_TOKEN` | Yes (auth-server) | — | Bearer token for `/auth.json` |
| `LOG_LEVEL` | No | `info` | `debug` / `info` / `warn` / `error` |
| `LOG_FORMAT` | No | `json` | `json` / `plain` |
| `SSE_RING_BUFFER_SIZE` | No | `200` | SSE ring buffer size per session |
| `MAX_CONCURRENT_SESSIONS_PER_USER` | No | `3` | Max running sessions per user |

CLI arguments: `--auth-server` / `--auth-proxy-url <url>` / `--auth-proxy-token <token>`

## API Reference

### Auth (Public)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Email/password login → sets `pi_session` cookie |
| GET | `/auth/github` | GitHub OAuth redirect |
| GET | `/auth/github/callback` | GitHub OAuth callback → sets `pi_session` cookie |

### Auth (Protected)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/me` | Current authenticated user info |
| POST | `/auth/change-password` | Change password (email auth users only) |
| POST | `/auth/logout` | Clear auth cookie |

### Sessions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sessions` | List user's sessions |
| POST | `/api/sessions` | Create session `{ cwd?, sessionDir?, label? }` |
| PATCH | `/api/sessions/:id` | Update label `{ label }` |
| DELETE | `/api/sessions/:id` | Soft delete (409 if running) |

### Runtime

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sessions/:id/send` | Send message `{ message }` — 202 accepted, 409 busy, 429 limit |
| GET | `/api/sessions/:id/events` | SSE stream (`event: pi\|status\|error`, `id` for reconnect) |
| POST | `/api/sessions/:id/abort` | Abort running session |
| GET | `/api/sessions/:id/status` | Session status: `idle` / `running` / `error` |
| GET | `/api/sessions/:id/history` | Message history from JSONL |

### Models

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/models` | List available LLM models (only those with valid credentials) |

## Architecture

```
┌──────────────────────────────────────────────────┐
│              HTTP Layer (Hono + Node.js)          │
│  CORS, body limit (1MB), request logging         │
├──────────────────────────────────────────────────┤
│              Auth Layer                           │
│  GitHub OAuth | Email/Password → signed cookie    │
├──────────────────────────────────────────────────┤
│              Binding Layer (SQLite)               │
│  users + sessions (soft delete)                   │
│  Path security: relative paths + user root        │
├──────────────────────────────────────────────────┤
│              Runtime Layer (SessionRegistry)      │
│  On-demand: create → prompt → SSE broadcast →     │
│  dispose. Ring buffer, serial protection, timeout │
├──────────────────────────────────────────────────┤
│              Pi SDK Layer (shared singleton)      │
│  AuthStorage + ModelRegistry                      │
│  3 modes: local / auth-server / auth-proxy        │
└──────────────────────────────────────────────────┘
```

## CLI

```bash
pi-server add-user       --email <email> --password <password> --login <displayName>
pi-server list-users
pi-server reset-password --email <email> --password <newPassword>
```

In Docker: `docker exec pi-server pi-server <command>`

## Testing

```bash
npm test              # Run all tests (vitest)
npm run test:watch    # Watch mode
```

## Development

```bash
npm install           # Install dependencies
npm run dev           # Start dev server (tsx, auto-restart)
npm run build         # Compile TypeScript to dist/
npm start             # Run compiled production build
```

## License

ISC
