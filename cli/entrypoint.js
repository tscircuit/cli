#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageRoot = join(__dirname, "..")
const require = createRequire(import.meta.url)

const globalPackageJson = require("../package.json")

const useGlobal = process.argv.includes("--use-global")
const args = process.argv.slice(2).filter((arg) => arg !== "--use-global")

let mainPath = join(packageRoot, "dist/cli/main.js")
let mainPackageRoot = packageRoot

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
      mainPackageRoot = localPackageRoot
    }
  } catch {}
}

const mainRequire = createRequire(join(mainPackageRoot, "package.json"))
const tsxLoaderUrl = pathToFileURL(mainRequire.resolve("tsx")).href

const { status } = spawnSync(
  process.execPath,
  ["--import", tsxLoaderUrl, mainPath, ...args],
  {
    stdio: "inherit",
  },
)

process.exit(status ?? 0)
