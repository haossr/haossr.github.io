#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Prefer brew ruby@3.2 on macOS when available.
if [ -d "/opt/homebrew/opt/ruby@3.2/bin" ]; then
  export PATH="/opt/homebrew/opt/ruby@3.2/bin:$PATH"
fi

# Avoid Jekyll/Sass encoding issues.
export LANG="${LANG:-en_US.UTF-8}"
export LC_ALL="${LC_ALL:-en_US.UTF-8}"

PORT="${PORT:-4000}"
HOST="${HOST:-127.0.0.1}"
BASE_URL="${BASE_URL:-http://${HOST}:${PORT}}"

bundle config set path vendor/bundle >/dev/null
bundle install --quiet

# Start Jekyll.
(bundle exec jekyll serve --host "$HOST" --port "$PORT" --quiet & echo $! > /tmp/jekyll_pid)

# Wait for server.
for _ in $(seq 1 80); do
  if curl -fsS "$BASE_URL/" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

npm ci --silent
BASE_URL="$BASE_URL" npx playwright test

# Stop server.
kill "$(cat /tmp/jekyll_pid)" 2>/dev/null || true
rm -f /tmp/jekyll_pid
