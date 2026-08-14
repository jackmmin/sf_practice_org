#!/usr/bin/env bash
# Wrapper: loads .env, then delegates to log-task.js
# Usage:
#   scripts/notion/log-task.sh --title "..." --summary "..." --project "..." --session-id "..." [--date YYYY-MM-DD]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [ -f "$PROJECT_ROOT/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "$PROJECT_ROOT/.env"
    set +a
fi

node "$SCRIPT_DIR/log-task.js" "$@"
