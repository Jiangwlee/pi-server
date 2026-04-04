#!/usr/bin/env sh
set -eu

ROLE="${PI_ROLE:-pi-server}"
PORT="${PORT:-3000}"

if [ "$ROLE" = "auth-server" ]; then
  exec node --use-env-proxy dist/index.js --auth-server
fi

TEST_USER_EMAIL="${TEST_USER_EMAIL:-test-user@gmail.com}"
TEST_USER_PASSWORD="${TEST_USER_PASSWORD:-test-pass-123}"
TEST_USER_LOGIN="${TEST_USER_LOGIN:-test-user}"

node dist/cli.js add-user \
  --email "$TEST_USER_EMAIL" \
  --password "$TEST_USER_PASSWORD" \
  --login "$TEST_USER_LOGIN" >/tmp/add-user.log 2>&1 || {
    if grep -q "already exists" /tmp/add-user.log; then
      echo "Test user already exists: $TEST_USER_EMAIL"
    else
      cat /tmp/add-user.log >&2
      exit 1
    fi
  }

exec node --use-env-proxy dist/index.js --auth-proxy-url "${AUTH_PROXY_URL:-http://auth-server:3001}" --auth-proxy-token "${AUTH_PROXY_TOKEN:-change-me}"
