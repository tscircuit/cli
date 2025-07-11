#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

function commandExists(cmd) {
  try {
    const res = spawnSync(cmd, ["--version"], { stdio: "ignore" })
    return res.status === 0
  } catch {
    return false
  }
}

const runner = commandExists("bun") ? "bun" : "tsx"

const __dirname = dirname(fileURLToPath(import.meta.url))
const mainPath = join(__dirname, "main.ts")

const { status } = spawnSync(runner, [mainPath, ...process.argv.slice(2)], {
  stdio: "inherit",
})

process.exit(status ?? 0)
