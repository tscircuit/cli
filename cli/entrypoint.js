#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

function commandExists(cmd) {
  try {
    const res = spawnSync(cmd, ["--version"], { stdio: "ignore" })
    return res.status === 0
  } catch {
    return false
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

const currentPackagePath = join(__dirname, "../package.json")
let mainPath = join(__dirname, "../dist/main.js")

try {
  const localPackagePath = require.resolve("@tscircuit/cli/package.json", {
    paths: [process.cwd()],
  })

  if (localPackagePath !== currentPackagePath) {
    const localPackageJson = JSON.parse(readFileSync(localPackagePath, "utf-8"))
    const globalPackageJson = JSON.parse(
      readFileSync(currentPackagePath, "utf-8"),
    )
    const localMainPath = join(dirname(localPackagePath), "dist/main.js")

    if (existsSync(localMainPath)) {
      console.warn(
        `Using local @tscircuit/cli v${localPackageJson.version} instead of global v${globalPackageJson.version}`,
      )
      mainPath = localMainPath
    }
  }
} catch {}

const runner = commandExists("bun") ? "bun" : "tsx"

const { status } = spawnSync(runner, [mainPath, ...process.argv.slice(2)], {
  stdio: "inherit",
})

process.exit(status ?? 0)
