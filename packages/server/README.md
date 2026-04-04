# @pi-server/server

Multi-user HTTP backend for `pi` coding agent.

## Run (from monorepo root)

```bash
# Dev
pnpm dev:server

# Build + start
pnpm --filter @pi-server/server build
pnpm --filter @pi-server/server start
```

## CLI

```bash
pnpm --filter @pi-server/server exec tsx src/cli.ts add-user --email admin@example.com --password secret --login admin
pnpm --filter @pi-server/server exec tsx src/cli.ts list-users
pnpm --filter @pi-server/server exec tsx src/cli.ts reset-password --email admin@example.com --password newpass
```

## Docker

- Dockerfile: `packages/server/docker/Dockerfile`
- Used by root `docker-compose.yml` services:
  - `auth-server`
  - `pi-server`
