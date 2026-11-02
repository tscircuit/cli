#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
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
const packageRoot = join(__dirname, "..")
const require = createRequire(import.meta.url)

function resolveRunner(mainPath, cliArgs) {
  if (commandExists("bun")) {
    return { command: "bun", args: [mainPath, ...cliArgs] }
  }

  return { command: process.execPath, args: [mainPath, ...cliArgs] }
}

const globalPackageJson = require("../package.json")

const useGlobal = process.argv.includes("--use-global")
const args = process.argv.slice(2).filter((arg) => arg !== "--use-global")

let mainPath = join(packageRoot, "dist/cli/main.js")

if (!useGlobal) {
  try {
    const localRequire = createRequire(join(process.cwd(), "package.json"))
    const localPackageJsonPath = localRequire.resolve(
      "@tscircuit/cli/package.json",
    )
    const localPackageJson = localRequire(localPackageJsonPath)
    const localPackageRoot = dirname(localPackageJsonPath)
    const localMainPath = join(localPackageRoot, "dist/cli/main.js")

    if (localPackageRoot !== packageRoot && existsSync(localMainPath)) {
      console.warn(
        `Using local @tscircuit/cli v${localPackageJson.version} instead of global v${globalPackageJson.version}`,
      )
      mainPath = localMainPath
    }
  } catch {}
}

const runner = resolveRunner(mainPath, args)
const { status, error, signal } = spawnSync(runner.command, runner.args, {
  stdio: "inherit",
})

if (error) {
  console.error(
    `Failed to launch tscircuit CLI with "${runner.command}": ${error.message}`,
  )
  process.exit(1)
}

process.exit(status ?? (signal ? 1 : 0))
