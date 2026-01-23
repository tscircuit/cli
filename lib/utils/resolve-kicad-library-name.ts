import path from "node:path"
import fs from "node:fs"
import { loadProjectConfig } from "lib/project-config"
import { getUnscopedPackageName } from "./get-unscoped-package-name"

export interface ResolveKicadLibraryNameOptions {
  projectDir: string
}

/**
 * Resolves the KiCad library name using the following fallback chain:
 * 1. config.kicadLibraryName (from tscircuit.config.json)
 * 2. package.json name (unscoped, with dots replaced by dashes)
 * 3. directory name
 */
export function resolveKicadLibraryName({
  projectDir,
}: ResolveKicadLibraryNameOptions): string {
  const projectConfig = loadProjectConfig(projectDir)

  // 1. Check config's kicadLibraryName
  if (projectConfig?.kicadLibraryName) {
    return projectConfig.kicadLibraryName
  }

  // 2. Try package.json name
  const packageJsonPath = path.join(projectDir, "package.json")
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))
    const unscopedName = getUnscopedPackageName(packageJson.name || "")
    if (unscopedName) {
      // Replace dots with dashes for KiCad compatibility
      return unscopedName.replace("@tsci/", "").replace(/\./g, "-")
    }
  }

  throw new Error(
    `Couldn't resolve KiCad library name. Please set kicadLibraryName in tscircuit.config.json or add the "name" field to package.json`,
  )
}
