import { createRequire } from "node:module"
import path from "node:path"

export async function importFromUserLand(
  moduleName: string,
  baseDir: string = process.cwd(),
) {
  // First try to resolve relative to the user's project without triggering
  // Bun's auto-install (which can pull in inconsistent dependency versions).
  // `createRequire().resolve()` walks parent directories, so nested entrypoints
  // still pick up dependencies from the nearest project root.
  const userRequire = createRequire(path.join(path.resolve(baseDir), "noop.js"))
  try {
    const resolvedUserPath = userRequire.resolve(moduleName)
    return await import(resolvedUserPath)
  } catch (error: any) {
    if (error?.code !== "MODULE_NOT_FOUND") {
      throw error
    }
  }

  // Next, fall back to the CLI's own dependencies to ensure we use the
  // versions bundled with the tool when the user hasn't installed them.
  const cliRequire = createRequire(import.meta.url)
  try {
    const resolvedCliPath = cliRequire.resolve(moduleName)
    return await import(resolvedCliPath)
  } catch (error: any) {
    if (error?.code !== "MODULE_NOT_FOUND") {
      throw error
    }
  }

  // Final fallback to dynamic import (may trigger auto-install)
  return import(moduleName)
}
