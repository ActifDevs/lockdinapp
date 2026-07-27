#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set. Add it to .env.local before running pnpm dev." >&2
  exit 1
fi

API_PORT="${API_PORT:-3001}"
WEB_PORT="${WEB_PORT:-5173}"

cleanup() {
  kill "${API_PID:-}" "${WEB_PID:-}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting API server on http://localhost:${API_PORT} ..."
PORT="$API_PORT" pnpm --filter @workspace/api-server run dev &
API_PID=$!

echo "Waiting for API ..."
for _ in $(seq 1 60); do
  if curl -sf "http://localhost:${API_PORT}/api/healthz" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -sf "http://localhost:${API_PORT}/api/healthz" >/dev/null 2>&1; then
  echo "API server did not become ready on port ${API_PORT}." >&2
  exit 1
fi

echo "Starting frontend on http://localhost:${WEB_PORT} ..."
PORT="$WEB_PORT" BASE_PATH=/ API_PROXY_TARGET="http://localhost:${API_PORT}" \
  pnpm --filter @workspace/revision-platform run dev &
WEB_PID=$!

wait
