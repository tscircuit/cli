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
    const modulePath = await Bun.resolve(moduleName, process.cwd())
    return await import(modulePath)
  }
}
