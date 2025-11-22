import fs from "node:fs"
import path from "node:path"
import type { CachedKicadRepoInfo } from "./cache-kicad-footprints"

type PackageJson = {
  name?: string
  exports?: string | Record<string, unknown>
  [key: string]: unknown
}

const normalizeExportsObject = (
  pkg: PackageJson,
): Record<string, unknown> | null => {
  if (pkg.exports === undefined) {
    return {}
  }

  if (typeof pkg.exports === "string") {
    return { ".": pkg.exports }
  }

  if (typeof pkg.exports === "object" && !Array.isArray(pkg.exports)) {
    return pkg.exports as Record<string, unknown>
  }

  return null
}

export function patchKicadPackageExports(info: CachedKicadRepoInfo): void {
  const packageJsonPath = path.join(info.packagePath, "package.json")
  let pkg: PackageJson
  let createdPackageJson = false

  if (!fs.existsSync(packageJsonPath)) {
    pkg = {
      name: info.packageDirName,
      type: "module",
      exports: {},
    }
    createdPackageJson = true
  } else {
    try {
      pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      console.warn(
        `[tsci] Could not parse package.json for ${info.packageDirName}: ${reason}`,
      )
      return
    }
  }

  const exportsField = normalizeExportsObject(pkg)
  if (!exportsField) {
    console.warn(
      `[tsci] package.json exports for ${info.packageDirName} is not an object or string. Skipping KiCad export patch.`,
    )
    return
  }

  let updated = false
  for (const [subpath, target] of Object.entries(info.exportsMap)) {
    if (exportsField[subpath] === target) {
      continue
    }

    if (exportsField[subpath] && exportsField[subpath] !== target) {
      console.warn(
        `[tsci] Overriding existing export for ${subpath} in ${info.packageDirName} to point at ${target}.`,
      )
    }

    exportsField[subpath] = target
    updated = true
  }

  if (!updated && !createdPackageJson) {
    return
  }

  pkg.exports = exportsField
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`)

  console.log(
    `Patched package exports for ${info.packageDirName} to reference cached KiCad modules.`,
  )
}
