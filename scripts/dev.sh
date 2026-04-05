#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# ── Constants ───────────────────────────────────────────────────────────────
SERVER_PORT=3000
FRONTEND_PORT=3100
ENV_FILE="$ROOT_DIR/.env.dev"
DEV_DIR="$ROOT_DIR/.dev"
PID_DIR="$DEV_DIR/pids"
LOG_DIR="$DEV_DIR/logs"

# ── Helpers ─────────────────────────────────────────────────────────────────
die()  { echo "ERROR: $*" >&2; exit 1; }
info() { echo "==> $*"; }

ensure_dirs() {
  mkdir -p "$PID_DIR" "$LOG_DIR"
}

ensure_env() {
  if [[ ! -f "$ENV_FILE" ]]; then
    info "Generating $ENV_FILE ..."
    cat > "$ENV_FILE" <<EOF
SESSION_SECRET=$(openssl rand -hex 32)
LOG_LEVEL=debug
LOG_FORMAT=plain
PI_SERVER_DATA=$ROOT_DIR/data
EOF
    info "Created $ENV_FILE (add your overrides there)"
  fi
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
}

cleanup_ports() {
  local port pids
  for port in "$SERVER_PORT" "$FRONTEND_PORT"; do
    # Combine lsof and ss to catch all listeners (including child processes)
    pids=$(
      { lsof -ti:"$port" 2>/dev/null || true; ss -tlnp "sport = :$port" 2>/dev/null | grep -oP 'pid=\K[0-9]+' || true; } \
      | sort -u
    )
    if [[ -n "$pids" ]]; then
      info "Killing processes on port $port: $(echo $pids | tr '\n' ' ')"
      echo "$pids" | xargs kill 2>/dev/null || true
    fi
  done
  # Wait for ports to be freed
  if [[ -n "${pids:-}" ]]; then
    sleep 1
  fi
}

build_deps() {
  info "Building @pi-server/ui ..."
  pnpm --filter @pi-server/ui build
}

# ── Dev Commands ────────────────────────────────────────────────────────────
dev_run() {
  cleanup_ports
  ensure_env
  build_deps
  info "Starting server (:$SERVER_PORT) + frontend (:$FRONTEND_PORT) ..."
  npx concurrently \
    --names "server,frontend" \
    --prefix-colors "blue,green" \
    --kill-others \
    "pnpm --filter @pi-server/server dev" \
    "cd packages/frontend && npx next dev -p $FRONTEND_PORT"
}

dev_start() {
  ensure_dirs
  cleanup_ports
  ensure_env
  build_deps
  info "Starting in background ..."
  npx concurrently \
    --names "server,frontend" \
    --prefix-colors "blue,green" \
    --kill-others \
    "pnpm --filter @pi-server/server dev" \
    "cd packages/frontend && npx next dev -p $FRONTEND_PORT" \
    > "$LOG_DIR/dev.log" 2>&1 &
  local pid=$!
  echo "$pid" > "$PID_DIR/dev.pid"
  info "Background PID: $pid"
  info "Logs: $LOG_DIR/dev.log"
}

dev_stop() {
  local pidfile="$PID_DIR/dev.pid"
  if [[ ! -f "$pidfile" ]]; then
    # Fallback: kill by port
    info "No PID file, cleaning up by port ..."
    cleanup_ports
    return
  fi
  local pid
  pid=$(<"$pidfile")
  if kill -0 "$pid" 2>/dev/null; then
    info "Stopping PID $pid and children ..."
    kill -- -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
    sleep 1
  fi
  rm -f "$pidfile"
  # Ensure ports are freed
  cleanup_ports
  info "Stopped."
}

# ── Docker Commands ─────────────────────────────────────────────────────────
docker_run() {
  docker compose up
}

docker_start() {
  docker compose up -d
  info "Running in background. Use '$0 docker stop' to stop."
}

docker_stop() {
  docker compose down
}

docker_rebuild() {
  info "Rebuilding images ..."
  docker compose build --no-cache
  info "Starting ..."
  docker compose up
}

# ── Usage ───────────────────────────────────────────────────────────────────
usage() {
  cat <<EOF
Usage: $0 <group> <command>

Development (local):
  dev run        Start server + frontend in foreground
  dev start      Start in background (logs in .dev/logs/)
  dev stop       Stop background processes

Docker:
  docker run       docker compose up (foreground)
  docker start     docker compose up -d (background)
  docker stop      docker compose down
  docker rebuild   Rebuild images (no cache) and start
EOF
}

# ── Main ────────────────────────────────────────────────────────────────────
GROUP="${1:-}"
CMD="${2:-}"

case "$GROUP" in
  dev)
    case "$CMD" in
      run)     dev_run ;;
      start)   dev_start ;;
      stop)    dev_stop ;;
      *)       usage; exit 1 ;;
    esac
    ;;
  docker)
    case "$CMD" in
      run)     docker_run ;;
      start)   docker_start ;;
      stop)    docker_stop ;;
      rebuild) docker_rebuild ;;
      *)       usage; exit 1 ;;
    esac
    ;;
  -h|--help|help|"")
    usage ;;
  *)
    die "Unknown group: $GROUP"
    ;;
esac
