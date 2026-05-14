#!/bin/sh
set -e
HOST="${BACKEND_HOST:-127.0.0.1}"
PORT="${BACKEND_PORT:-8080}"

if command -v lsof >/dev/null 2>&1; then
  if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo >&2 "Error: port $PORT is already in use (BACKEND_HOST=$HOST)."
    echo >&2 "Stop the other process (often a leftover Django runserver) or use another port, e.g.:"
    echo >&2 "  BACKEND_PORT=8081 pnpm dev"
    echo >&2 "If you change BACKEND_PORT, set BACKEND_URL in apps/web/.env.local to match (e.g. http://127.0.0.1:8081)."
    exit 1
  fi
fi

if [ -x .venv/bin/python ]; then
  PYTHON_BIN=.venv/bin/python
elif [ -x ../../env/bin/python ]; then
  PYTHON_BIN=../../env/bin/python
else
  PYTHON_BIN=python3
fi

exec "$PYTHON_BIN" manage.py runserver "$HOST:$PORT"
