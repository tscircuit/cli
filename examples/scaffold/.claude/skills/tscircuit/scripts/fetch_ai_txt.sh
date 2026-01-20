#!/usr/bin/env bash
set -euo pipefail

OUT="${1:-ai.txt}"

if command -v curl >/dev/null 2>&1; then
  curl -L "https://docs.tscircuit.com/ai.txt" -o "$OUT"
elif command -v wget >/dev/null 2>&1; then
  wget -O "$OUT" "https://docs.tscircuit.com/ai.txt"
else
  echo "Neither curl nor wget found. Install one of them to download ai.txt" >&2
  exit 127
fi

echo "Wrote $OUT" >&2
