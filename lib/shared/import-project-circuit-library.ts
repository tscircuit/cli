import path from "node:path"
import { pathToFileURL } from "node:url"
import { resolve } from "import-meta-resolve"

export async function importProjectCircuitLibrary(projectDir = process.cwd()) {
  let entry: string
  try {
    entry = resolve(
      "tscircuit",
      pathToFileURL(path.join(projectDir, "noop.js")).href,
    )
  } catch (error: any) {
    if (error?.code !== "ERR_MODULE_NOT_FOUND") throw error
    return import("@tscircuit/core")
  }
  // A broken project installation must surface its error instead of mixing cores.
  return import(entry)
}
