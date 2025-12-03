#!/usr/bin/env bash
set -euo pipefail

mkdir -p .ci-debug
LOG=".ci-debug/diagnostics.log"
: > "$LOG"
exec > >(tee -a "$LOG") 2>&1

section () { echo; echo "============================================================"; echo "$1"; echo "============================================================"; }
trybash () { echo; echo "+ $*"; bash -lc "$*" || echo "!! command failed (continuing): $*"; }

section "Basic env"
echo "pwd: $(pwd)"
echo "CI: ${CI:-}"
echo "NODE_ENV: ${NODE_ENV:-}"
echo "Bun: $(bun --version)"
echo "Node: $(node -v || true)"
echo "npm: $(npm -v || true)"
echo "OS: $(uname -a || true)"
echo "Date: $(date -u || true)"
echo "FAILING_CMD: ${FAILING_CMD:-}"

section "Ensure tools exist (rg/jq/python3)"
if ! command -v rg >/dev/null 2>&1 || ! command -v jq >/dev/null 2>&1 || ! command -v python3 >/dev/null 2>&1; then
  trybash "sudo apt-get update -y"
  trybash "sudo apt-get install -y ripgrep jq python3"
fi

section "Repo + package.json overview"
trybash "ls -la"
trybash "cat package.json"
echo
echo "Lockfiles present:"
trybash "ls -la bun.lock bun.lockb package-lock.json pnpm-lock.yaml yarn.lock 2>/dev/null || true"

section "Bun install (record if bun.lock changes)"
before_hash="$(sha256sum bun.lock 2>/dev/null | awk '{print $1}' || true)"
trybash "bun install"
after_hash="$(sha256sum bun.lock 2>/dev/null | awk '{print $1}' || true)"
echo "bun.lock sha256 before: ${before_hash}"
echo "bun.lock sha256 after : ${after_hash}"
if [ -n "${before_hash}" ] && [ -n "${after_hash}" ] && [ "${before_hash}" != "${after_hash}" ]; then
  echo "WARNING: bun.lock changed during CI install"
  trybash "git --no-pager diff -- bun.lock || true"
fi

section "Dependency overview"
trybash "bun pm ls zod || true"
trybash "bun pm ls @tscircuit/props tscircuit easyeda @tscircuit/core winterspec @anatine/zod-openapi || true"

section "Write JS diagnostics scripts"
python3 - <<'PY'
from pathlib import Path
Path(".ci-debug").mkdir(parents=True, exist_ok=True)

Path(".ci-debug/zod_sanity.mjs").write_text(r"""
try {
  console.log("import.meta.resolve('zod') =", import.meta.resolve("zod"));
  console.log("import.meta.resolve('zod/package.json') =", import.meta.resolve("zod/package.json"));

  const zod = await import("zod");
  const pkg = await import("zod/package.json");
  const p = pkg.default ?? pkg;

  console.log("zod version:", p.version);
  console.log("has default export:", ("default" in zod));
  console.log("typeof default:", typeof zod.default);

  const z = zod.z;
  console.log("has z:", !!z);
  console.log("typeof z.string:", typeof (z?.string));
  if (z && typeof z.string === "function") {
    const s = z.string();
    console.log("typeof z.string()._parse:", typeof s._parse);
  }
} catch (e) {
  console.error("ERROR importing zod:", e?.stack ?? e);
}
""".lstrip(), encoding="utf-8")

Path(".ci-debug/pkg_entrypoints.mjs").write_text(r"""
const pkgs = ["@tscircuit/props","easyeda","@tscircuit/file-server","winterspec","@anatine/zod-openapi","tscircuit"];
for (const name of pkgs) {
  try {
    const pj = await import(`${name}/package.json`);
    const p = pj.default ?? pj;
    console.log("\n---", name, "---");
    console.log("version:", p.version);
    console.log("type:", p.type);
    console.log("main:", p.main);
    console.log("module:", p.module);
    console.log("exports:", p.exports);
  } catch (e) {
    console.log("\n---", name, "---");
    console.log("could not import package.json:", e?.message ?? e);
  }
}
""".lstrip(), encoding="utf-8")
PY

section "Run JS diagnostics via bun"
trybash "bun .ci-debug/zod_sanity.mjs"
trybash "bun .ci-debug/pkg_entrypoints.mjs"

section "Print first 160 lines of compiled entrypoints (props + easyeda)"
trybash "if [ -f node_modules/@tscircuit/props/dist/index.js ]; then echo '--- @tscircuit/props/dist/index.js ---'; sed -n '1,160p' node_modules/@tscircuit/props/dist/index.js; fi"
trybash "if [ -f node_modules/easyeda/dist/index.js ]; then echo '--- easyeda/dist/index.js ---'; sed -n '1,160p' node_modules/easyeda/dist/index.js; fi"
trybash "if [ -f node_modules/easyeda/dist/browser/index.js ]; then echo '--- easyeda/dist/browser/index.js ---'; sed -n '1,160p' node_modules/easyeda/dist/browser/index.js; fi"

section "Fingerprint search for the crash site"
trybash "rg -n --hidden --no-ignore 'keyValidator\\._parse|ParseInputLazyPath|_parse\\(new ParseInputLazyPath' node_modules || true"

section "Search node_modules for suspicious z.record() patterns"
trybash "rg -n --hidden --no-ignore 'z\\.record\\(\\s*z\\.(string|number|enum)\\b(?!\\()|z\\.record\\(z\\.(string|number|enum)\\b(?!\\()|z\\.record\\(\\s*[A-Za-z_$][A-Za-z0-9_$]*\\s*,' node_modules || true"

section "Search repo and node_modules for the exact error string"
trybash "rg -n --hidden --no-ignore 'keyValidator\\._parse is not a function|Failed to generate circuit JSON' . || true"

section "Multiple zod copies check"
trybash "find node_modules -path '*/node_modules/zod/package.json' -maxdepth 6 -print || true"
trybash "find node_modules -type d -name zod -maxdepth 6 -print | head -n 200 || true"

section "Run failing command with full capture"
run_capture () {
  local cmd="$1"
  echo
  echo "### Running: $cmd"

  export NODE_OPTIONS="${NODE_OPTIONS:-} --enable-source-maps --unhandled-rejections=strict"

  set +e
  bash -lc "$cmd" > .ci-debug/failing_cmd.out.txt 2> .ci-debug/failing_cmd.err.txt
  status=$?
  set -e

  echo "Exit status: $status"
  echo "--- stderr (last 250 lines) ---"
  tail -n 250 .ci-debug/failing_cmd.err.txt || true
  echo "--- stdout (last 250 lines) ---"
  tail -n 250 .ci-debug/failing_cmd.out.txt || true

  cat .ci-debug/failing_cmd.err.txt .ci-debug/failing_cmd.out.txt > .ci-debug/failing_cmd.combined.txt || true

  echo
  echo "Extract likely stack locations from output:"
  rg -n "keyValidator\\._parse is not a function|ParseInputLazyPath|node_modules/.+:[0-9]+:[0-9]+" .ci-debug/failing_cmd.combined.txt || true

  loc=$(rg -o "node_modules/[^: ]+:[0-9]+:[0-9]+" .ci-debug/failing_cmd.combined.txt | head -n 1 || true)
  if [ -n "$loc" ]; then
    echo
    echo "First node_modules location: $loc"
    f=$(echo "$loc" | cut -d: -f1)
    l=$(echo "$loc" | cut -d: -f2)
    if [ -f "$f" ]; then
      start=$((l-60)); [ $start -lt 1 ] && start=1
      end=$((l+60))
      echo "--- Context $f:$l ---"
      nl -ba "$f" | sed -n "${start},${end}p" || true
    fi
  fi
  return 0
}

if [ -n "${FAILING_CMD:-}" ]; then
  run_capture "${FAILING_CMD}"
else
  echo "FAILING_CMD not set; skipping"
fi

section "Snapshot/output sanity (common ENOENT follow-up)"
trybash "ls -la /tmp || true"
trybash "find /tmp -maxdepth 4 -type d -name '__snapshots__' -print || true"
trybash "find /tmp -maxdepth 6 -type f -name '*.snap.svg' -print | head -n 200 || true"

section "Finished diagnostics"
echo "Wrote logs to: $LOG"
echo "Artifacts:"
trybash "ls -la .ci-debug || true"
