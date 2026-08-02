import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"

let registered = false

const findCorePackageDir = (startDir: string): string | null => {
  let dir = startDir
  while (true) {
    const candidate = path.join(dir, "node_modules", "@tscircuit", "core")
    if (fs.existsSync(path.join(candidate, "package.json"))) return candidate
    const parent = path.dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

const getCoreEsmEntry = (corePackageDir: string): string | null => {
  const packageJsonPath = path.join(corePackageDir, "package.json")
  if (!fs.existsSync(packageJsonPath)) return null

  const corePkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))

  let entry: unknown = corePkg.exports
  if (entry && typeof entry === "object" && "." in (entry as any)) {
    entry = (entry as any)["."]
  }
  if (entry && typeof entry === "object") {
    entry = (entry as any).import ?? (entry as any).default
  }
  if (typeof entry !== "string") {
    entry = corePkg.module ?? corePkg.main
  }
  if (typeof entry !== "string") return null

  const entryPath = path.join(corePackageDir, entry)
  return fs.existsSync(entryPath) ? entryPath : null
}

/**
 * Registry components published before @tscircuit/core went ESM-only ship CJS
 * builds that start with `require("@tscircuit/core")`. Core's exports map only
 * declares an `import` condition, so that require can never resolve and the
 * build fails with "Cannot find module '@tscircuit/core'" (#3982).
 *
 * When requiring core from the project would fail, this registers a virtual
 * module that serves the project's ESM build of core to both `require()` and
 * `import` consumers, so every component shares the same core instance.
 */
export const registerEsmOnlyCoreRequireBridge = (projectDir: string) => {
  if (registered) return
  if (typeof Bun === "undefined") return

  const requireFromProject = createRequire(
    path.join(projectDir, "node_modules", "noop.cjs"),
  )
  try {
    requireFromProject.resolve("@tscircuit/core")
    return
  } catch {}

  const corePackageDir = findCorePackageDir(projectDir)
  if (!corePackageDir) return

  const coreEsmEntry = getCoreEsmEntry(corePackageDir)
  if (!coreEsmEntry) return

  Bun.plugin({
    name: "esm-only-core-require-bridge",
    setup(build) {
      build.module("@tscircuit/core", () => ({
        exports: requireFromProject(coreEsmEntry),
        loader: "object",
      }))
    },
  })
  registered = true
}
