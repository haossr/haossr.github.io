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

bundle config set path vendor/bundle >/dev/null
bundle install --quiet

bundle exec jekyll serve --host 127.0.0.1 --port 4000
