import Module, { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { resolve } from "import-meta-resolve"

let isCjsCoreFallbackRegistered = false
const activeCjsFallbackEntryPaths = new Map<string, string>()

export async function registerCjsCoreFallback(projectDir = process.cwd()) {
  const userLandParentUrl = pathToFileURL(path.join(projectDir, "noop.js")).href
  let tscircuitParentUrl: string | undefined
  try {
    tscircuitParentUrl = resolve("tscircuit", userLandParentUrl)
  } catch {
    // Ignore if tscircuit is not directly resolvable from projectDir
  }

  const moduleWithInternals = Module as typeof Module & {
    _cache?: Record<string, unknown>
    _resolveFilename?: (
      request: string,
      parent: unknown,
      isMain: boolean,
      options?: unknown,
    ) => string
  }
  const caches = [
    moduleWithInternals._cache,
    createRequire(import.meta.url).cache as Record<string, unknown> | undefined,
  ]

  for (const specifier of ["@tscircuit/core", "react", "react/jsx-runtime"]) {
    let resolvedUrl: string | undefined
    for (const parentUrl of [
      userLandParentUrl,
      tscircuitParentUrl,
      import.meta.url,
    ]) {
      if (!parentUrl) continue
      try {
        resolvedUrl = resolve(specifier, parentUrl)
        break
      } catch {}
    }
    if (!resolvedUrl) continue

    try {
      const entryPath = fileURLToPath(resolvedUrl)
      const modNamespace = await import(resolvedUrl)
      activeCjsFallbackEntryPaths.set(specifier, entryPath)
      const exportedValue =
        specifier === "@tscircuit/core"
          ? modNamespace
          : (modNamespace.default ?? modNamespace)

      for (const cache of caches) {
        if (cache && !cache[entryPath]) {
          cache[entryPath] = {
            id: entryPath,
            filename: entryPath,
            loaded: true,
            exports: exportedValue,
          }
        }
      }
    } catch {
      // Ignore fallback preloading errors so primary module resolution handles them
    }
  }

  if (
    !isCjsCoreFallbackRegistered &&
    typeof moduleWithInternals._resolveFilename === "function"
  ) {
    isCjsCoreFallbackRegistered = true
    const origResolveFilename = moduleWithInternals._resolveFilename
    moduleWithInternals._resolveFilename = function (
      request: string,
      parent: unknown,
      isMain: boolean,
      options?: unknown,
    ) {
      try {
        return origResolveFilename.call(this, request, parent, isMain, options)
      } catch (error) {
        const fallbackPath = activeCjsFallbackEntryPaths.get(request)
        if (fallbackPath) {
          return fallbackPath
        }
        throw error
      }
    }
  }
}

export async function importFromUserLand(
  moduleName: string,
  projectDir = process.cwd(),
) {
  for (const parent of [
    pathToFileURL(path.join(projectDir, "noop.js")).href,
    import.meta.url,
  ]) {
    let resolved: string
    try {
      resolved = resolve(moduleName, parent)
    } catch (error: any) {
      if (error?.code === "ERR_PACKAGE_PATH_NOT_EXPORTED") {
        resolved = pathToFileURL(createRequire(parent).resolve(moduleName)).href
      } else if (error?.code === "ERR_MODULE_NOT_FOUND") {
        continue
      } else {
        throw error
      }
    }
    const imported = await import(resolved)
    if (moduleName === "react") {
      await registerCjsCoreFallback(projectDir)
    }
    return imported
  }

  const imported = await import(moduleName)
  if (moduleName === "react") {
    await registerCjsCoreFallback(projectDir)
  }
  return imported
}
