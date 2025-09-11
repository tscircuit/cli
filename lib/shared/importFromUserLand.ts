import { relative, resolve } from "node:path"

export async function importFromUserLand(moduleName: string) {
  try {
    // Create a temporary path that helps resolve from cwd
    const resolvedPath = import.meta.resolve(
      moduleName,
      resolve(process.cwd(), "dummy.js"),
    )
    return await import(resolvedPath)
  } catch (error) {
    // Fallback: try resolving with Bun.resolve
    try {
      const modulePath = await Bun.resolve(moduleName, process.cwd())
      return await import(modulePath)
    } catch (error) {
      // If we can't resolve the module, resolve via dynamic import
      const module = await import(moduleName)
      return module
    }
  }
}
