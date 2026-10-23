import { createRequire } from "node:module"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { resolve } from "import-meta-resolve"

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
    return import(resolved)
  }

  return import(moduleName)
}
