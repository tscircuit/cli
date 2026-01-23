#!/usr/bin/env bash
set -euo pipefail

if ! command -v tsci >/dev/null 2>&1; then
  echo "tsci not found. Install it first:" >&2
  echo "  npm install -g tscircuit" >&2
  echo "  # or" >&2
  echo "  bun install --global tscircuit" >&2
  exit 127
fi

TARGET="${1:-.}"

echo "Running: tsci build ${TARGET}" >&2
tsci build "$TARGET"

echo "OK: tsci build" >&2
