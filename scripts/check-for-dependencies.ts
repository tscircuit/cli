#!/usr/bin/env bun

import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { exit } from "node:process"

console.log("🔍 Checking runtime dependencies...")

try {
  const packageJson = JSON.parse(readFileSync("package.json", "utf-8"))

  const dependencies: Record<string, string> = packageJson.dependencies ?? {}

  const devDependencies: Record<string, string> =
    packageJson.devDependencies ?? {}

  const sourceFiles = getRuntimeFiles()

  const usedPackages = getUsedPackages(sourceFiles)

  for (const pkg of usedPackages) {
    if (dependencies[pkg]) {
      continue
    }

    if (devDependencies[pkg]) {
      console.error(
        `❌ Error: "${pkg}" is in devDependencies but is required at runtime.`,
      )
      console.error(
        `👉 Move "${pkg}" from devDependencies to dependencies in package.json.`,
      )
      exit(1)
    }

    console.error(
      `❌ Error: "${pkg}" is required in source code but is missing from package.json.`,
    )
    console.error(`👉 Add "${pkg}" to dependencies.`)
    exit(1)
  }

  console.log("✅ All runtime dependencies are valid.")
  exit(0)
} catch (error) {
  console.error("❌ Dependency check failed:", error)
  exit(1)
}

function getSourceFiles(dir: string): string[] {
  const files: string[] = []

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue
      files.push(...getSourceFiles(fullPath))
    }

    if (
      stat.isFile() &&
      [".ts", ".tsx", ".js", ".jsx", ".mjs"].some((ext) => entry.endsWith(ext))
    ) {
      files.push(fullPath)
    }
  }

  return files
}

function getRuntimeFiles(): string[] {
  const files: string[] = []

  if (existsSync("dist/main.js")) {
    files.push("dist/main.js")
  }

  if (existsSync("dist")) {
    files.push(...getSourceFiles("dist").filter((f) => f !== "dist/main.js"))
  }

  return files
}

function existsSync(path: string): boolean {
  try {
    statSync(path)
    return true
  } catch {
    return false
  }
}

function getUsedPackages(files: string[]): Set<string> {
  const packages = new Set<string>()

  const patterns = [
    /import\s+.*?\s+from\s+["'](@[^/]+\/[^/"'"]+|(?![.\/])\w[^"']*)["']/g,
    /import\s*\(\s*["'](@[^/]+\/[^/"'"]+|(?![.\/])\w[^"']*)["']\s*\)/g,
    /require\s*\(\s*["'](@[^/]+\/[^/"'"]+|(?![.\/])\w[^"']*)["']\s*\)/g,
  ]

  for (const file of files) {
    const content = readFileSync(file, "utf-8")

    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(content))) {
        const pkg = match[1].startsWith("@")
          ? match[1].split("/").slice(0, 2).join("/")
          : match[1].split("/")[0]

        if (pkg.startsWith("node:")) continue

        const nodeBuiltIns = [
          "fs",
          "path",
          "os",
          "util",
          "events",
          "stream",
          "buffer",
          "crypto",
          "http",
          "https",
          "url",
          "querystring",
          "assert",
          "child_process",
          "cluster",
          "dgram",
          "dns",
          "domain",
          "net",
          "readline",
          "repl",
          "tls",
          "vm",
          "zlib",
          "console",
          "process",
          "timers",
          "worker_threads",
          "perf_hooks",
          "diagnostics_channel",
          "module",
        ]
        if (nodeBuiltIns.includes(pkg)) continue

        const runtimeTools = ["bun", "tsx", "node", "npm", "yarn", "pnpm"]
        if (runtimeTools.includes(pkg)) continue

        const localDirs = [
          "lib",
          "cli",
          "src",
          "app",
          "components",
          "utils",
          "types",
        ]
        if (localDirs.includes(pkg)) continue

        packages.add(pkg)
      }
    }
  }

  return packages
}
