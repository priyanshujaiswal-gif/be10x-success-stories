#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

API_PORT="${API_PORT:-4318}"
export API_PORT

# Wait for API health (start runs detached; Vite proxies /api to the API).
npm run dev:api &
api_pid=$!

for _ in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:${API_PORT}/api/health" >/dev/null; then
    break
  fi
  if ! kill -0 "$api_pid" 2>/dev/null; then
    echo "API process exited before becoming healthy" >&2
    wait "$api_pid" || true
    exit 1
  fi
  sleep 0.5
done

if ! curl -sf "http://127.0.0.1:${API_PORT}/api/health" >/dev/null; then
  echo "API did not become healthy on port ${API_PORT}" >&2
  kill "$api_pid" 2>/dev/null || true
  exit 1
fi

exec npm run dev
