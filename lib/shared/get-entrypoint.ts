import * as fs from "node:fs"
import * as path from "node:path"
import { loadProjectConfig, saveProjectConfig } from "lib/project-config"
import kleur from "kleur"

type EntrypointOptions = {
  filePath?: string
  projectDir?: string
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
  updateConfig?: boolean
}

/**
 * Detect the main entrypoint for a tscircuit project
 *
 * Logic:
 * 1. Use provided filePath if specified
 * 2. Check tscircuit.config.json for mainEntrypoint
 * 3. Check common locations (index.tsx, index.ts, lib/index.tsx, etc.)
 * 4. Update config with detected entrypoint
 */
export const getEntrypoint = async ({
  filePath,
  projectDir = process.cwd(),
  onSuccess = (message) => console.log(message),
  onError = (message) => console.error(message),
  updateConfig = true,
}: EntrypointOptions): Promise<string | null> => {
  // 1. Use provided filePath if specified
  if (filePath) {
    return path.resolve(projectDir, filePath)
  }

  // 2. Check tscircuit.config.json for mainEntrypoint
  const projectConfig = loadProjectConfig(projectDir)
  if (projectConfig?.mainEntrypoint) {
    const configEntrypoint = path.resolve(
      projectDir,
      projectConfig.mainEntrypoint,
    )
    if (fs.existsSync(configEntrypoint)) {
      onSuccess(
        `Using entrypoint from tscircuit.config.json: '${path.relative(projectDir, configEntrypoint)}'`,
      )
      return configEntrypoint
    }
  }

  // 3. Check common locations
  const possibleEntrypoints = [
    path.resolve(projectDir, "index.tsx"),
    path.resolve(projectDir, "index.ts"),
    path.resolve(projectDir, "lib/index.tsx"),
    path.resolve(projectDir, "lib/index.ts"),
    path.resolve(projectDir, "src/index.tsx"),
    path.resolve(projectDir, "src/index.ts"),
  ]

  let detectedEntrypoint: string | null = null

  for (const entrypoint of possibleEntrypoints) {
    if (fs.existsSync(entrypoint)) {
      detectedEntrypoint = entrypoint
      const relativePath = path.relative(projectDir, entrypoint)
      onSuccess(`Detected entrypoint: '${relativePath}'`)

      // 4. Update config with detected entrypoint
      if (updateConfig) {
        const newConfig = projectConfig || {}
        newConfig.mainEntrypoint = relativePath
        saveProjectConfig(newConfig, projectDir)
        onSuccess(`Updated tscircuit.config.json with detected entrypoint`)
      }

      break
    }
  }

  if (!detectedEntrypoint) {
    onError(
      kleur.red(
        "No entrypoint found. Run 'tsci init' to bootstrap a basic project or specify a file with 'tsci push <file>'",
      ),
    )
  }

  return detectedEntrypoint
}
