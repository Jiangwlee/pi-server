# pi-server

Multi-user HTTP backend framework for [pi coding-agent](https://github.com/mariozechner/pi). Provides user isolation, unified LLM credential management, and on-demand session runtime.

## Features

- **Multi-user isolation** — GitHub OAuth + email/password authentication, user↔session binding in SQLite
- **Unified LLM credentials** — Server-side shared AuthStorage + ModelRegistry
- **On-demand session runtime** — Sessions created on demand, not persistent in memory
- **SSE streaming** — Real-time event streaming with ring buffer reconnection support
- **Distributed deployment** — Auth Server mode for sharing LLM credentials across nodes

## Quick Start

### Install

```bash
npm install
```

### Configure

Required environment variables:

```bash
export SESSION_SECRET="your-secret-at-least-32-bytes-long"
export PI_SERVER_DATA="./data"  # default
export PORT=3000                # default
```

Optional (GitHub OAuth):

```bash
export GITHUB_CLIENT_ID="..."
export GITHUB_CLIENT_SECRET="..."
```

### Create Users

```bash
npx tsx src/cli.ts add-user --email admin@example.com --password secret --login admin
npx tsx src/cli.ts list-users
npx tsx src/cli.ts reset-password --email admin@example.com --password newpass
```

### Start Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Deployment Modes

### Standalone (default)

Reads LLM credentials from local `~/.pi/agent/auth.json`.

### Auth Server

Serves `auth.json` to other nodes:

```bash
export AUTH_SERVER_TOKEN="shared-bearer-token"
npx tsx src/index.ts --auth-server
```

### Distributed (Auth Proxy)

Pulls credentials from an auth server:

```bash
npx tsx src/index.ts --auth-proxy-url http://auth-host:3001 --auth-proxy-token shared-bearer-token
```

## API Overview

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Email/password login |
| POST | `/auth/change-password` | Change password (email users) |
| GET | `/auth/me` | Current authenticated user |
| POST | `/auth/logout` | Clear auth session cookie |
| GET | `/auth/github` | GitHub OAuth redirect |
| GET | `/auth/github/callback` | GitHub OAuth callback |

### Sessions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sessions` | List user sessions |
| POST | `/api/sessions` | Create session |
| PATCH | `/api/sessions/:id` | Update session label |
| DELETE | `/api/sessions/:id` | Soft delete session |

### Runtime

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sessions/:id/send` | Send message (202, async) |
| GET | `/api/sessions/:id/events` | SSE event stream |
| POST | `/api/sessions/:id/abort` | Abort running session |
| GET | `/api/sessions/:id/status` | Get session status |
| GET | `/api/sessions/:id/history` | Get message history |

### Models

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/models` | List available models |

## Architecture

```
HTTP Layer (Hono + Node.js)
  ├── Auth Layer (GitHub OAuth / Email+Password → unified cookie)
  ├── Binding Layer (SQLite: users + sessions)
  ├── Runtime Layer (SessionRegistry: on-demand pi sessions)
  └── Pi SDK Layer (AuthStorage + ModelRegistry + createAgentSession)
```

## Testing

```bash
npm test
```
