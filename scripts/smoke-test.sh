#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f ".env" ]]; then
  echo "Missing .env file"
  exit 1
fi

if [[ ! -f "$HOME/.pi/agent/auth.json" ]]; then
  echo "Missing required auth file: $HOME/.pi/agent/auth.json"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required"
  exit 1
fi

IMAGE_TAG="pi-server:smoke-$(date +%s)"
PROJECT_NAME="pi-server-smoke-$(date +%s)"
AUTH_PORT=3301
SERVER_PORT=3300
COOKIE_FILE="/tmp/pi-smoke-cookie-$$.txt"
EVENTS_FILE="/tmp/pi-smoke-events-$$.txt"

cleanup() {
  set +e
  COMPOSE_PROJECT_NAME="$PROJECT_NAME" PI_SERVER_IMAGE="$IMAGE_TAG" docker compose down -v --remove-orphans >/dev/null 2>&1
  docker image rm "$IMAGE_TAG" >/dev/null 2>&1
  rm -f "$COOKIE_FILE" "$EVENTS_FILE"
}
trap cleanup EXIT

echo "[smoke] Building image: $IMAGE_TAG"
docker build -t "$IMAGE_TAG" -f packages/server/docker/Dockerfile .

echo "[smoke] Starting stack"
COMPOSE_PROJECT_NAME="$PROJECT_NAME" PI_SERVER_IMAGE="$IMAGE_TAG" PI_AUTH_PORT="$AUTH_PORT" PI_SERVER_PORT="$SERVER_PORT" docker compose up -d --no-build

echo "[smoke] Waiting for auth-server health"
for _ in $(seq 1 40); do
  health="$(COMPOSE_PROJECT_NAME="$PROJECT_NAME" PI_SERVER_IMAGE="$IMAGE_TAG" docker compose ps --format json \
    | jq -r 'select(.Service=="auth-server") | .Health // ""' | tail -n 1)"
  if [[ "$health" == "healthy" ]]; then
    break
  fi
  sleep 1
done

if [[ "${health:-}" != "healthy" ]]; then
  echo "[smoke] auth-server not healthy in time"
  COMPOSE_PROJECT_NAME="$PROJECT_NAME" PI_SERVER_IMAGE="$IMAGE_TAG" docker compose logs --tail=200
  exit 1
fi

echo "[smoke] Waiting for pi-server readiness"
for _ in $(seq 1 40); do
  if curl -s -o /dev/null "http://127.0.0.1:$SERVER_PORT/"; then
    break
  fi
  sleep 1
done

echo "[smoke] Running API checks"
LOGIN_CODE="$(curl -s -o /tmp/pi-smoke-login.json -w '%{http_code}' -c "$COOKIE_FILE" -H 'content-type: application/json' \
  -d '{"email":"test-user@gmail.com","password":"test-pass-123"}' "http://127.0.0.1:$SERVER_PORT/auth/login")"
ME_CODE="$(curl -s -o /tmp/pi-smoke-me.json -w '%{http_code}' -b "$COOKIE_FILE" "http://127.0.0.1:$SERVER_PORT/auth/me")"
SESS_CODE="$(curl -s -o /tmp/pi-smoke-session.json -w '%{http_code}' -b "$COOKIE_FILE" -H 'content-type: application/json' -d '{}' \
  "http://127.0.0.1:$SERVER_PORT/api/sessions")"
SESSION_ID="$(jq -r '.id // empty' /tmp/pi-smoke-session.json)"
SEND_CODE="$(curl -s -o /tmp/pi-smoke-send.json -w '%{http_code}' -b "$COOKIE_FILE" -H 'content-type: application/json' \
  -d '{"message":"Reply with exactly: SMOKE_OK"}' "http://127.0.0.1:$SERVER_PORT/api/sessions/$SESSION_ID/send")"
set +e
timeout 30s curl -sN -b "$COOKIE_FILE" "http://127.0.0.1:$SERVER_PORT/api/sessions/$SESSION_ID/events" > "$EVENTS_FILE"
SSE_EXIT_CODE=$?
set -e
if [[ "$SSE_EXIT_CODE" != "0" && "$SSE_EXIT_CODE" != "124" ]]; then
  echo "[smoke] SSE stream request failed with exit code $SSE_EXIT_CODE"
  COMPOSE_PROJECT_NAME="$PROJECT_NAME" PI_SERVER_IMAGE="$IMAGE_TAG" docker compose logs --tail=200
  exit 1
fi
MODELS_CODE="$(curl -s -o /tmp/pi-smoke-models.json -w '%{http_code}' -b "$COOKIE_FILE" "http://127.0.0.1:$SERVER_PORT/api/models")"
MODELS_COUNT="$(jq 'length' /tmp/pi-smoke-models.json)"

if [[ "$LOGIN_CODE" != "200" || "$ME_CODE" != "200" || "$SESS_CODE" != "201" || "$SEND_CODE" != "202" || "$MODELS_CODE" != "200" ]]; then
  echo "[smoke] HTTP status check failed"
  echo "login=$LOGIN_CODE me=$ME_CODE sessions=$SESS_CODE send=$SEND_CODE models=$MODELS_CODE"
  COMPOSE_PROJECT_NAME="$PROJECT_NAME" PI_SERVER_IMAGE="$IMAGE_TAG" docker compose logs --tail=200
  exit 1
fi

if ! grep -q 'SMOKE_OK' "$EVENTS_FILE"; then
  echo "[smoke] expected assistant output not found in SSE stream"
  COMPOSE_PROJECT_NAME="$PROJECT_NAME" PI_SERVER_IMAGE="$IMAGE_TAG" docker compose logs --tail=200
  exit 1
fi

echo "[smoke] PASS"
echo "[smoke] session_id=$SESSION_ID models=$MODELS_COUNT"
