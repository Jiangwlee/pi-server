FROM node:22-bookworm-slim AS builder

WORKDIR /app

RUN corepack enable \
  && corepack prepare pnpm@latest --activate \
  && npm config set registry https://registry.npmmirror.com \
  && pnpm config set registry https://registry.npmjs.org

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json /app/
COPY packages/ui/package.json /app/packages/ui/package.json
COPY packages/frontend/package.json /app/packages/frontend/package.json

RUN pnpm install --no-frozen-lockfile --filter @pi-server/frontend...

COPY packages/ui /app/packages/ui
COPY packages/frontend /app/packages/frontend

RUN pnpm --filter @pi-server/ui build \
  && pnpm --filter @pi-server/frontend build

FROM node:22-bookworm-slim AS runner

WORKDIR /app

RUN corepack enable \
  && corepack prepare pnpm@latest --activate

COPY --from=builder /app /app

WORKDIR /app/packages/frontend

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

CMD ["pnpm", "start"]
